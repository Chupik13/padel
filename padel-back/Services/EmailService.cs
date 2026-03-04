using System.Net;
using System.Net.Mail;

namespace padel.Services;

public class EmailService(IConfiguration configuration)
{
    public async Task SendPasswordResetEmail(string email, string token, string lang)
    {
        var smtpUser = configuration["Smtp:User"]
            ?? throw new InvalidOperationException("Smtp:User is not configured");
        var smtpPassword = configuration["Smtp:Password"]
            ?? throw new InvalidOperationException("Smtp:Password is not configured");
        var smtpHost = configuration["Smtp:Host"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(configuration["Smtp:Port"] ?? "587");
        var frontendUrl = configuration["App:FrontendUrl"]
            ?? throw new InvalidOperationException("App:FrontendUrl is not configured");

        var resetLink = $"{frontendUrl}/reset-password?token={Uri.EscapeDataString(token)}";

        var (subject, body) = lang == "ru"
            ? ("Сброс пароля — Georgiano",
               $"""
               <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                 <h2 style="color:#0ea573">Georgiano</h2>
                 <p>Вы запросили сброс пароля. Нажмите на кнопку ниже:</p>
                 <a href="{resetLink}" style="display:inline-block;padding:12px 24px;background:#0ea573;color:#fff;text-decoration:none;border-radius:8px;margin:16px 0">Сбросить пароль</a>
                 <p style="color:#888;font-size:14px">Ссылка действительна 30 минут. Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
               </div>
               """)
            : ("Password Reset — Georgiano",
               $"""
               <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                 <h2 style="color:#0ea573">Georgiano</h2>
                 <p>You requested a password reset. Click the button below:</p>
                 <a href="{resetLink}" style="display:inline-block;padding:12px 24px;background:#0ea573;color:#fff;text-decoration:none;border-radius:8px;margin:16px 0">Reset Password</a>
                 <p style="color:#888;font-size:14px">This link is valid for 30 minutes. If you didn't request a reset, just ignore this email.</p>
               </div>
               """);

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            Credentials = new NetworkCredential(smtpUser, smtpPassword),
            EnableSsl = true
        };

        var message = new MailMessage
        {
            From = new MailAddress(smtpUser, "Georgiano"),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        message.To.Add(email);

        await client.SendMailAsync(message);
    }
}
