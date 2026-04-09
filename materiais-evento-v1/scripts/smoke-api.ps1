param(
  [string]$BaseUrl = "http://localhost:3000",
  [switch]$SkipWrite = $true
)

$ErrorActionPreference = "Stop"

function Test-Endpoint {
  param(
    [string]$Method,
    [string]$Url,
    [string]$Body
  )

  Write-Host "$Method $Url"
  if ($Body) {
    $response = Invoke-RestMethod -Method $Method -Uri $Url -ContentType "application/json" -Body $Body
  } else {
    $response = Invoke-RestMethod -Method $Method -Uri $Url
  }
  return $response
}

$materiais = Test-Endpoint -Method "GET" -Url "$BaseUrl/api/materiais"
if (-not $materiais) { throw "GET /api/materiais sem retorno" }

$pedidos = Test-Endpoint -Method "GET" -Url "$BaseUrl/api/pedidos"
if (-not ($pedidos.PSObject.Properties.Name -contains 'pedidos')) {
  throw "GET /api/pedidos sem campo pedidos"
}


$companheiros = Test-Endpoint -Method "GET" -Url "$BaseUrl/api/companheiros"
if (-not $companheiros.companheiros) { throw "GET /api/companheiros sem campo companheiros" }

$resumo = Test-Endpoint -Method "GET" -Url "$BaseUrl/api/estoque/resumo"
if (-not $resumo.global) { throw "GET /api/estoque/resumo sem campo global" }

$financeiro = Test-Endpoint -Method "GET" -Url "$BaseUrl/api/financeiro"
if (-not $financeiro.financeiro -and $financeiro.financeiro.Count -ne 0) {
  throw "GET /api/financeiro sem campo financeiro"
}

if (-not $SkipWrite) {
  $payload = @{ pedidos = $pedidos.pedidos } | ConvertTo-Json -Depth 10
  $putResult = Test-Endpoint -Method "PUT" -Url "$BaseUrl/api/pedidos" -Body $payload
  if (-not $putResult.ok) { throw "PUT /api/pedidos sem ok=true" }
}

Write-Host "Smoke API concluido com sucesso."
