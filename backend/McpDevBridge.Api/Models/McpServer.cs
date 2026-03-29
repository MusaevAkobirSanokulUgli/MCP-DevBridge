// ============================================================
// MCP DevBridge - McpServer Entity Model
// Represents a registered MCP server instance
// ============================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace McpDevBridge.Api.Models;

public class McpServer
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty; // "github", "database", "filesystem"

    [Required]
    [MaxLength(500)]
    public string Endpoint { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Status { get; set; } = "inactive"; // "active", "inactive", "error"

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// JSON-serialized configuration key-value pairs
    /// </summary>
    public string Configuration { get; set; } = "{}";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Tool> Tools { get; set; } = new List<Tool>();
    public ICollection<ToolInvocation> Invocations { get; set; } = new List<ToolInvocation>();
    public ICollection<ConnectionLog> ConnectionLogs { get; set; } = new List<ConnectionLog>();
}

// --- DTOs ---

public class McpServerCreateDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Endpoint { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public Dictionary<string, string> Configuration { get; set; } = new();
}

public class McpServerUpdateDto
{
    [MaxLength(100)]
    public string? Name { get; set; }

    [MaxLength(500)]
    public string? Endpoint { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public Dictionary<string, string>? Configuration { get; set; }
}

public class McpServerResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, string> Configuration { get; set; } = new();
    public int ToolCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
