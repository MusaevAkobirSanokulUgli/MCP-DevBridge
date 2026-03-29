// ============================================================
// MCP DevBridge - SignalR Dashboard Hub
// Real-time communication hub for the frontend dashboard
// ============================================================

using Microsoft.AspNetCore.SignalR;

namespace McpDevBridge.Api.Hubs;

public class DashboardHub : Hub
{
    private readonly ILogger<DashboardHub> _logger;

    public DashboardHub(ILogger<DashboardHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Dashboard client connected: {ConnectionId}", Context.ConnectionId);
        await Clients.Caller.SendAsync("Connected", new
        {
            ConnectionId = Context.ConnectionId,
            Timestamp = DateTime.UtcNow,
            Message = "Connected to MCP DevBridge real-time feed"
        });
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Dashboard client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Client can subscribe to specific server events.
    /// </summary>
    public async Task SubscribeToServer(string serverId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"server-{serverId}");
        _logger.LogInformation("Client {ConnectionId} subscribed to server {ServerId}", Context.ConnectionId, serverId);
    }

    /// <summary>
    /// Client can unsubscribe from server events.
    /// </summary>
    public async Task UnsubscribeFromServer(string serverId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"server-{serverId}");
        _logger.LogInformation("Client {ConnectionId} unsubscribed from server {ServerId}", Context.ConnectionId, serverId);
    }

    /// <summary>
    /// Client can ping the hub to verify connectivity.
    /// </summary>
    public async Task Ping()
    {
        await Clients.Caller.SendAsync("Pong", new
        {
            Timestamp = DateTime.UtcNow
        });
    }
}
