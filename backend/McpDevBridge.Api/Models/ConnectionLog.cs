// ============================================================
// MCP DevBridge - ConnectionLog Entity Model
// Tracks connection events between the gateway and MCP servers
// ============================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace McpDevBridge.Api.Models;

public class ConnectionLog
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string ServerId { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Event { get; set; } = string.Empty; // "connected", "disconnected", "error", "tool_call"

    [MaxLength(500)]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Optional extended details (JSON)
    /// </summary>
    public string? Details { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("ServerId")]
    public McpServer? Server { get; set; }
}

// --- DTOs ---

public class ConnectionLogResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string ServerId { get; set; } = string.Empty;
    public string ServerName { get; set; } = string.Empty;
    public string Event { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime Timestamp { get; set; }
}

public class LogQueryParams
{
    public string? ServerId { get; set; }
    public string? Event { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
