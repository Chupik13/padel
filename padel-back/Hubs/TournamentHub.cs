using Microsoft.AspNetCore.SignalR;

namespace padel.Hubs;

public class TournamentHub : Hub
{
    public async Task JoinTournament(int tournamentId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"tournament-{tournamentId}");
    }

    public async Task LeaveTournament(int tournamentId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"tournament-{tournamentId}");
    }
}
