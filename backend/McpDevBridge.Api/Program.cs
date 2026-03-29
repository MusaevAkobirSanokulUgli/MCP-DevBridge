// ============================================================
// MCP DevBridge - .NET 9 API Gateway
// Main application entry point and service configuration
// ============================================================

using McpDevBridge.Api.Data;
using McpDevBridge.Api.Hubs;
using McpDevBridge.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// --- Database ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// --- HTTP Client for MCP Protocol ---
builder.Services.AddHttpClient<IMcpProtocolService, McpProtocolService>();

// --- Application Services ---
builder.Services.AddScoped<ILoggingService, LoggingService>();
builder.Services.AddScoped<IServerManagerService, ServerManagerService>();

// --- SignalR ---
builder.Services.AddSignalR();

// --- Controllers ---
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = false;
    });

// --- Swagger ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title = "MCP DevBridge API",
        Version = "v1",
        Description = "Universal Developer Tool Integration Platform - API Gateway for MCP servers"
    });
});

// --- CORS ---
var allowedOrigins = (builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000", "https://mcp-devbridge.vercel.app" }).ToList();
var extraOrigins = Environment.GetEnvironmentVariable("CORS_ORIGINS");
if (!string.IsNullOrEmpty(extraOrigins))
    allowedOrigins.AddRange(extraOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins.ToArray())
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// --- Background Health Check Service ---
builder.Services.AddHostedService<HealthCheckBackgroundService>();

var app = builder.Build();

// --- Ensure database is created and migrated ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    // Update seeded server endpoints from configuration (supports Docker internal hostnames)
    var githubEndpoint = app.Configuration["McpServers:GitHubServer"];
    var databaseEndpoint = app.Configuration["McpServers:DatabaseServer"];
    var filesystemEndpoint = app.Configuration["McpServers:FileSystemServer"];

    var serversToUpdate = db.McpServers.ToList();
    foreach (var server in serversToUpdate)
    {
        var newEndpoint = server.Id switch
        {
            "srv-github-001" when githubEndpoint != null => githubEndpoint,
            "srv-database-001" when databaseEndpoint != null => databaseEndpoint,
            "srv-filesystem-001" when filesystemEndpoint != null => filesystemEndpoint,
            _ => null
        };
        if (newEndpoint != null && server.Endpoint != newEndpoint)
        {
            server.Endpoint = newEndpoint;
            server.UpdatedAt = DateTime.UtcNow;
        }
    }
    db.SaveChanges();
}

// --- Middleware Pipeline ---
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "MCP DevBridge API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("AllowFrontend");
app.UseRouting();
app.MapControllers();
app.MapHub<DashboardHub>("/hubs/dashboard");

// --- Root endpoint ---
app.MapGet("/", () => Results.Ok(new
{
    name = "MCP DevBridge API Gateway",
    version = "1.0.0",
    documentation = "/swagger",
    health = "/api/health",
    timestamp = DateTime.UtcNow
}));

app.Run();

// ============================================================
// Background service for periodic health checks
// ============================================================

public class HealthCheckBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<HealthCheckBackgroundService> _logger;

    public HealthCheckBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<HealthCheckBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait for startup to complete
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var serverManager = scope.ServiceProvider.GetRequiredService<IServerManagerService>();
                await serverManager.PerformHealthChecksAsync();
                _logger.LogDebug("Health check cycle completed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during health check cycle");
            }

            // Check every 30 seconds
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
