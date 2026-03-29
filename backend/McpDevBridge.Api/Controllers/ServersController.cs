// ============================================================
// MCP DevBridge - Servers Controller
// CRUD operations for MCP server configurations
// ============================================================

using McpDevBridge.Api.Models;
using McpDevBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace McpDevBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServersController : ControllerBase
{
    private readonly IServerManagerService _serverManager;
    private readonly ILogger<ServersController> _logger;

    public ServersController(
        IServerManagerService serverManager,
        ILogger<ServersController> logger)
    {
        _serverManager = serverManager;
        _logger = logger;
    }

    /// <summary>
    /// Get all registered MCP servers.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<McpServerResponseDto>>> GetAll()
    {
        var servers = await _serverManager.GetAllServersAsync();
        return Ok(servers);
    }

    /// <summary>
    /// Get a specific MCP server by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<McpServerResponseDto>> GetById(string id)
    {
        var server = await _serverManager.GetServerByIdAsync(id);
        if (server == null) return NotFound(new { message = $"Server '{id}' not found" });
        return Ok(server);
    }

    /// <summary>
    /// Register a new MCP server.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<McpServerResponseDto>> Create([FromBody] McpServerCreateDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var validTypes = new[] { "github", "database", "filesystem" };
        if (!validTypes.Contains(dto.Type.ToLower()))
        {
            return BadRequest(new { message = $"Invalid server type. Must be one of: {string.Join(", ", validTypes)}" });
        }

        try
        {
            var server = await _serverManager.CreateServerAsync(dto);
            _logger.LogInformation("Created MCP server: {Name} ({Type})", dto.Name, dto.Type);
            return CreatedAtAction(nameof(GetById), new { id = server.Id }, server);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create server");
            return StatusCode(500, new { message = "Failed to create server", error = ex.Message });
        }
    }

    /// <summary>
    /// Update an existing MCP server configuration.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<McpServerResponseDto>> Update(string id, [FromBody] McpServerUpdateDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var updated = await _serverManager.UpdateServerAsync(id, dto);
        if (updated == null) return NotFound(new { message = $"Server '{id}' not found" });

        _logger.LogInformation("Updated MCP server: {Id}", id);
        return Ok(updated);
    }

    /// <summary>
    /// Delete an MCP server and all its associated data.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var deleted = await _serverManager.DeleteServerAsync(id);
        if (!deleted) return NotFound(new { message = $"Server '{id}' not found" });

        _logger.LogInformation("Deleted MCP server: {Id}", id);
        return NoContent();
    }

    /// <summary>
    /// Start/activate an MCP server (performs health check and tool sync).
    /// </summary>
    [HttpPost("{id}/start")]
    public async Task<ActionResult<McpServerResponseDto>> Start(string id)
    {
        var server = await _serverManager.StartServerAsync(id);
        if (server == null) return NotFound(new { message = $"Server '{id}' not found" });

        _logger.LogInformation("Started MCP server: {Id} (status: {Status})", id, server.Status);
        return Ok(server);
    }

    /// <summary>
    /// Stop/deactivate an MCP server.
    /// </summary>
    [HttpPost("{id}/stop")]
    public async Task<ActionResult<McpServerResponseDto>> Stop(string id)
    {
        var server = await _serverManager.StopServerAsync(id);
        if (server == null) return NotFound(new { message = $"Server '{id}' not found" });

        _logger.LogInformation("Stopped MCP server: {Id}", id);
        return Ok(server);
    }

    /// <summary>
    /// Refresh the tool registry for a specific server.
    /// </summary>
    [HttpPost("{id}/refresh-tools")]
    public async Task<IActionResult> RefreshTools(string id)
    {
        var server = await _serverManager.GetServerByIdAsync(id);
        if (server == null) return NotFound(new { message = $"Server '{id}' not found" });

        await _serverManager.RefreshServerToolsAsync(id);
        _logger.LogInformation("Refreshed tools for MCP server: {Id}", id);

        var updated = await _serverManager.GetServerByIdAsync(id);
        return Ok(updated);
    }
}
