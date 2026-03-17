using Microsoft.EntityFrameworkCore;
using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public class VideoService(PadelDbContext db, IWebHostEnvironment env, ILogger<VideoService> logger)
{
    private string VideosRoot
    {
        get
        {
            var root = Path.Combine(env.ContentRootPath, "data", "videos");
            Directory.CreateDirectory(root);
            return root;
        }
    }

    public async Task<MatchVideo> SaveVideoSegment(Stream stream, int matchId, int cameraSide, int operatorPlayerId, string contentType, string? orientation = null)
    {
        var ext = contentType switch
        {
            "video/webm" => "webm",
            "video/mp4" => "mp4",
            _ => "webm"
        };

        var dir = Path.Combine(VideosRoot, matchId.ToString());
        Directory.CreateDirectory(dir);

        var filePath = Path.Combine(dir, $"side{cameraSide}.{ext}");
        await using var fs = new FileStream(filePath, FileMode.Create);
        await stream.CopyToAsync(fs);
        var fileSize = fs.Length;

        logger.LogInformation("Saved video segment: matchId={MatchId}, side={Side}, size={Size}, path={Path}",
            matchId, cameraSide, fileSize, filePath);

        var existing = await db.MatchVideos
            .FirstOrDefaultAsync(v => v.MatchId == matchId && v.CameraSide == cameraSide);

        if (existing != null)
        {
            existing.FilePath = filePath;
            existing.ContentType = contentType;
            existing.FileSize = fileSize;
            existing.UploadedAt = DateTime.UtcNow;
            existing.OperatorPlayerId = operatorPlayerId;
            existing.MergeStatus = MergeStatus.Pending;
            existing.MergedFilePath = null;
            existing.Orientation = orientation ?? "landscape";
        }
        else
        {
            existing = new MatchVideo
            {
                MatchId = matchId,
                CameraSide = cameraSide,
                OperatorPlayerId = operatorPlayerId,
                FilePath = filePath,
                ContentType = contentType,
                FileSize = fileSize,
                UploadedAt = DateTime.UtcNow,
                MergeStatus = MergeStatus.Pending,
                Orientation = orientation ?? "landscape"
            };
            db.MatchVideos.Add(existing);
        }

        await db.SaveChangesAsync();

        // Check if both sides now uploaded — if so, mark all for merge
        var allVideos = await db.MatchVideos
            .Where(v => v.MatchId == matchId)
            .ToListAsync();

        if (allVideos.Count >= 2)
        {
            logger.LogInformation("Both sides uploaded for matchId={MatchId}, marking for merge", matchId);
            foreach (var v in allVideos)
                v.MergeStatus = MergeStatus.Pending;
            await db.SaveChangesAsync();
        }

        return existing;
    }

    public async Task<MatchVideoResult> GetVideoInfo(int matchId)
    {
        var videos = await db.MatchVideos
            .Where(v => v.MatchId == matchId)
            .ToListAsync();

        if (videos.Count == 0)
            return new MatchVideoResult { MatchId = matchId, MergeStatus = "None" };

        var hasBothSides = videos.Count >= 2;

        // Check for merged video file on disk
        var mergedPath = Path.Combine(VideosRoot, matchId.ToString(), "merged.mp4");
        var mergedRecord = videos.FirstOrDefault(v => v.MergeStatus == MergeStatus.Completed);

        if (mergedRecord != null && File.Exists(mergedPath))
        {
            return new MatchVideoResult
            {
                MatchId = matchId,
                VideoUrl = $"/api/videos/{matchId}/file/merged.mp4",
                HasBothSides = hasBothSides,
                MergeStatus = "Completed"
            };
        }

        // Fallback to single-side — prefer the largest file (longest recording)
        var single = videos
            .Where(v => File.Exists(v.FilePath))
            .OrderByDescending(v => v.FileSize)
            .FirstOrDefault() ?? videos.First();
        var ext = Path.GetExtension(single.FilePath).TrimStart('.');
        return new MatchVideoResult
        {
            MatchId = matchId,
            VideoUrl = $"/api/videos/{matchId}/file/side{single.CameraSide}.{ext}",
            HasBothSides = hasBothSides,
            MergeStatus = hasBothSides ? videos.Max(v => v.MergeStatus).ToString() : "Single"
        };
    }

    public async Task<List<MatchVideoResult>> GetTournamentVideos(int tournamentId)
    {
        var matchIds = await db.Matches
            .Where(m => m.TournamentId == tournamentId)
            .Select(m => m.Id)
            .ToListAsync();

        var results = new List<MatchVideoResult>();
        foreach (var matchId in matchIds)
        {
            var info = await GetVideoInfo(matchId);
            if (info.VideoUrl != null)
                results.Add(info);
        }
        return results;
    }

    private static async Task<double> GetVideoDuration(string filePath)
    {
        // Chrome WebM has Duration: N/A at format level. Try multiple strategies.
        string[] strategies =
        [
            $"-v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 \"{filePath}\"",
            $"-v error -select_streams v:0 -show_entries stream=duration -of default=noprint_wrappers=1:nokey=1 \"{filePath}\"",
            $"-v error -select_streams v:0 -show_entries packet=pts_time -of csv=p=0 \"{filePath}\""
        ];

        foreach (var args in strategies)
        {
            using var process = new System.Diagnostics.Process();
            process.StartInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "ffprobe",
                Arguments = args,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            process.Start();
            var output = await process.StandardOutput.ReadToEndAsync();
            await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            // For packet PTS strategy, take the last line (= last packet = duration)
            var lines = output.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            var line = args.Contains("packet=pts_time") ? lines.LastOrDefault() : lines.FirstOrDefault();
            if (line != null && double.TryParse(line.Trim(), System.Globalization.CultureInfo.InvariantCulture, out var d) && d > 0)
                return d;
        }

        return 0;
    }

    private static string Inv(double v) => v.ToString("F3", System.Globalization.CultureInfo.InvariantCulture);

    public async Task MergeSideBySide(int matchId)
    {
        var videos = await db.MatchVideos
            .Where(v => v.MatchId == matchId)
            .OrderBy(v => v.CameraSide)
            .ToListAsync();

        if (videos.Count < 2)
        {
            logger.LogWarning("Merge skipped for matchId={MatchId}: only {Count} video(s)", matchId, videos.Count);
            return;
        }

        var side1 = videos.FirstOrDefault(v => v.CameraSide == 1);
        var side2 = videos.FirstOrDefault(v => v.CameraSide == 2);

        if (side1 == null || side2 == null)
        {
            logger.LogWarning("Merge skipped for matchId={MatchId}: missing side1={S1} side2={S2}",
                matchId, side1 != null, side2 != null);
            return;
        }

        if (!File.Exists(side1.FilePath) || !File.Exists(side2.FilePath))
        {
            logger.LogWarning("Merge skipped for matchId={MatchId}: file missing. side1={P1} exists={E1}, side2={P2} exists={E2}",
                matchId, side1.FilePath, File.Exists(side1.FilePath), side2.FilePath, File.Exists(side2.FilePath));
            foreach (var v in videos)
                v.MergeStatus = MergeStatus.Failed;
            await db.SaveChangesAsync();
            return;
        }

        foreach (var v in videos)
            v.MergeStatus = MergeStatus.Processing;
        await db.SaveChangesAsync();

        var dir = Path.Combine(VideosRoot, matchId.ToString());
        var outputPath = Path.Combine(dir, "merged.mp4");

        // Probe durations to align by end and pick audio from the longer video
        var dur1 = await GetVideoDuration(side1.FilePath);
        var dur2 = await GetVideoDuration(side2.FilePath);
        logger.LogInformation("Video durations for matchId={MatchId}: side1={D1}s, side2={D2}s", matchId, dur1, dur2);

        const int SideW = 640;
        const int SideH = 360;

        // Build rotation filter based on orientation string from frontend
        static string BuildRotation(string? orientation) => orientation switch
        {
            "portrait" => "transpose=1,",
            _ => ""  // landscape/null → no rotation needed
        };

        var rotateLeft = BuildRotation(side1.Orientation);
        var rotateRight = BuildRotation(side2.Orientation);
        var scaleLeft = $"{rotateLeft}scale={SideW}:{SideH}:force_original_aspect_ratio=increase,crop={SideW}:{SideH}";
        var scaleRight = $"{rotateRight}scale={SideW}:{SideH}:force_original_aspect_ratio=increase,crop={SideW}:{SideH}";

        string filterComplex;
        string durationFlag;

        var diff = Math.Abs(dur1 - dur2);
        var maxDur = Math.Max(dur1, dur2);

        if (diff < 0.5 || dur1 <= 0 || dur2 <= 0)
        {
            // Nearly equal or probe failed — simple hstack
            var audioIdx = dur1 >= dur2 ? 0 : 1;
            filterComplex = $"[0:v]{scaleLeft}[left];[1:v]{scaleRight}[right];[left][right]hstack=inputs=2[v];" +
                            $"[{audioIdx}:a]acopy[a]";
            durationFlag = "";
        }
        else
        {
            // Different durations: shift shorter video with setpts to align ends
            var totalDur = Inv(maxDur);
            var offset = Inv(diff);
            var audioIdx = dur1 >= dur2 ? 0 : 1;
            durationFlag = $"-t {totalDur}";

            var leftPts = dur1 < dur2 ? $",setpts=PTS+{offset}/TB" : "";
            var rightPts = dur2 < dur1 ? $",setpts=PTS+{offset}/TB" : "";

            filterComplex = $"color=black:s={SideW * 2}x{SideH}:d={totalDur}:r=30[canvas];" +
                            $"[0:v]{scaleLeft}{leftPts}[left];" +
                            $"[1:v]{scaleRight}{rightPts}[right];" +
                            $"[canvas][left]overlay=0:0:eof_action=pass[tmp];" +
                            $"[tmp][right]overlay={SideW}:0:eof_action=pass[v];" +
                            $"[{audioIdx}:a]acopy[a]";
        }

        // Merge without trimming first, then trim the mp4 output (WebM can't seek)
        var rawPath = Path.Combine(dir, "merged_raw.mp4");
        var args = $"-y -i \"{side1.FilePath}\" -i \"{side2.FilePath}\" " +
                   $"-filter_complex \"{filterComplex}\" " +
                   $"-map \"[v]\" -map \"[a]\" " +
                   $"-c:v libx264 -c:a aac -preset ultrafast -crf 28 " +
                   $"-maxrate 2.5M -bufsize 5M -movflags +faststart " +
                   $"{durationFlag} \"{rawPath}\"";

        logger.LogInformation("FFmpeg merge for matchId={MatchId}: ffmpeg {Args}", matchId, args);

        try
        {
            using var process = new System.Diagnostics.Process();
            process.StartInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = args,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            process.Start();

            // Must read streams BEFORE WaitForExit to avoid deadlock
            var stderrTask = process.StandardError.ReadToEndAsync();
            var stdoutTask = process.StandardOutput.ReadToEndAsync();
            await Task.WhenAll(stderrTask, stdoutTask);
            await process.WaitForExitAsync();

            var stderr = stderrTask.Result;

            if (process.ExitCode == 0 && File.Exists(rawPath))
            {
                logger.LogInformation("FFmpeg merge SUCCESS for matchId={MatchId}, now trimming first 2s", matchId);

                // Trim first 2 seconds from the merged mp4 (fast, no re-encode)
                var trimArgs = $"-y -ss 2 -i \"{rawPath}\" -c copy -movflags +faststart \"{outputPath}\"";
                logger.LogInformation("FFmpeg trim for matchId={MatchId}: ffmpeg {Args}", matchId, trimArgs);

                using var trimProcess = new System.Diagnostics.Process();
                trimProcess.StartInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "ffmpeg",
                    Arguments = trimArgs,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                trimProcess.Start();
                var trimStderr = await trimProcess.StandardError.ReadToEndAsync();
                await trimProcess.StandardOutput.ReadToEndAsync();
                await trimProcess.WaitForExitAsync();

                // Clean up raw file
                if (File.Exists(rawPath)) File.Delete(rawPath);

                if (trimProcess.ExitCode == 0 && File.Exists(outputPath))
                {
                    var mergedSize = new FileInfo(outputPath).Length;
                    logger.LogInformation("FFmpeg trim SUCCESS for matchId={MatchId}, output size={Size}", matchId, mergedSize);
                    foreach (var v in videos)
                    {
                        v.MergeStatus = MergeStatus.Completed;
                        v.MergedFilePath = outputPath;
                        if (File.Exists(v.FilePath) && v.FilePath != outputPath)
                        {
                            File.Delete(v.FilePath);
                            logger.LogInformation("Deleted source file: {Path}", v.FilePath);
                        }
                    }
                }
                else
                {
                    logger.LogError("FFmpeg trim FAILED for matchId={MatchId}, exitCode={Code}, stderr={Stderr}",
                        matchId, trimProcess.ExitCode, trimStderr);
                    foreach (var v in videos)
                        v.MergeStatus = MergeStatus.Failed;
                }
            }
            else
            {
                logger.LogError("FFmpeg merge FAILED for matchId={MatchId}, exitCode={Code}, stderr={Stderr}",
                    matchId, process.ExitCode, stderr);
                foreach (var v in videos)
                    v.MergeStatus = MergeStatus.Failed;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "FFmpeg exception for matchId={MatchId}", matchId);
            foreach (var v in videos)
                v.MergeStatus = MergeStatus.Failed;
        }

        await db.SaveChangesAsync();
    }

    public string? GetVideoFilePath(int matchId, string fileName)
    {
        // Sanitize fileName to prevent path traversal
        var safe = Path.GetFileName(fileName);
        var filePath = Path.Combine(VideosRoot, matchId.ToString(), safe);
        return File.Exists(filePath) ? filePath : null;
    }

    public async Task DeleteMatchVideos(int matchId)
    {
        var dir = Path.Combine(VideosRoot, matchId.ToString());
        if (Directory.Exists(dir))
            Directory.Delete(dir, true);

        var videos = await db.MatchVideos.Where(v => v.MatchId == matchId).ToListAsync();
        db.MatchVideos.RemoveRange(videos);
        await db.SaveChangesAsync();
    }
}
