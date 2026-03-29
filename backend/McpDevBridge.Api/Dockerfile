# ============================================================
# MCP DevBridge - .NET 9 Backend API
# Multi-stage build for production deployment
# ============================================================

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Restore dependencies first (layer caching)
COPY McpDevBridge.Api/McpDevBridge.Api.csproj McpDevBridge.Api/
RUN dotnet restore McpDevBridge.Api/McpDevBridge.Api.csproj

# Copy source and publish
COPY . .
RUN dotnet publish McpDevBridge.Api/McpDevBridge.Api.csproj -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# Install curl for healthchecks and create data directory
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data \
    && adduser --disabled-password --gecos "" --uid 1001 appuser \
    && chown -R appuser:appuser /app /data

USER appuser

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "McpDevBridge.Api.dll"]
