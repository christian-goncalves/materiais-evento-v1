param(
  [string]$BaseUrl = "http://localhost:3010",
  [string]$SeedPath = ".\docs\materiais.factoria.dev\producao-seed.json",
  [switch]$SkipWrite = $false
)

$ErrorActionPreference = "Stop"

function Get-JsonFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Arquivo de seed nao encontrado: $Path"
  }
  return Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Url,
    [string]$Body
  )
  Write-Host "$Method $Url"
  if ($Body) {
    return Invoke-RestMethod -Method $Method -Uri $Url -ContentType "application/json" -Body $Body
  }
  return Invoke-RestMethod -Method $Method -Uri $Url
}

function Calc-Total {
  param($Pedido, $PrecoMap)
  $sum = 0
  foreach ($prop in $Pedido.itens.PSObject.Properties) {
    $materialId = [string]$prop.Name
    $qtd = [int]$prop.Value
    $preco = [int]($PrecoMap.$materialId)
    $sum += ($qtd * $preco)
  }
  return $sum
}

$seed = Get-JsonFile -Path $SeedPath
if (-not $seed.pedidos -or $seed.pedidos.Count -eq 0) {
  throw "Seed sem pedidos para importar."
}

$pedidosPayload = @()
foreach ($p in $seed.pedidos) {
  $pedidosPayload += @{
    id = [int]$p.id
    nome = [string]$p.nome
    data = [string]$p.data
    tel = [string]$p.tel
    itens = @{}
    pago = [string]$p.pago
    pagData = [string]$p.pagData
  }
  foreach ($item in $p.itens.PSObject.Properties) {
    $pedidosPayload[-1].itens[$item.Name] = [int]$item.Value
  }
}

$totalEsperado = 0
foreach ($p in $seed.pedidos) {
  $totalEsperado += Calc-Total -Pedido $p -PrecoMap $seed.materiais_preco_referencia
}

Write-Host "Pedidos no seed: $($seed.pedidos.Count)"
Write-Host "Total esperado no seed: R$ $totalEsperado"

if (-not $SkipWrite) {
  $body = @{ pedidos = $pedidosPayload } | ConvertTo-Json -Depth 15
  $put = Invoke-Api -Method "PUT" -Url "$BaseUrl/api/pedidos" -Body $body
  if (-not $put.ok) {
    throw "PUT /api/pedidos sem ok=true"
  }
}

$pedidosApi = Invoke-Api -Method "GET" -Url "$BaseUrl/api/pedidos"
$materiaisApi = Invoke-Api -Method "GET" -Url "$BaseUrl/api/materiais"
$resumoApi = Invoke-Api -Method "GET" -Url "$BaseUrl/api/estoque/resumo"
$financeiroApi = Invoke-Api -Method "GET" -Url "$BaseUrl/api/financeiro"

$precoMap = @{}
foreach ($m in $materiaisApi) {
  $precoMap[[string]$m.id] = [int]$m.preco
}

$totalApi = 0
foreach ($p in $pedidosApi.pedidos) {
  foreach ($item in $p.itens.PSObject.Properties) {
    $materialId = [string]$item.Name
    $qtd = [int]$item.Value
    $preco = [int]($precoMap[$materialId])
    $totalApi += ($qtd * $preco)
  }
}

Write-Host "----- RESUMO POS-IMPORTACAO -----"
Write-Host "Pedidos na API: $($pedidosApi.pedidos.Count)"
Write-Host "Total calculado na API: R$ $totalApi"
Write-Host "Materiais no estoque/resumo: $($resumoApi.global.Count)"
Write-Host "Companheiros no estoque/resumo: $($resumoApi.companheiros.Count)"
Write-Host "Lancamentos financeiro: $($financeiroApi.financeiro.Count)"

if (-not $SkipWrite) {
  if ($pedidosApi.pedidos.Count -ne $seed.pedidos.Count) {
    throw "Divergencia: quantidade de pedidos importados diferente do seed."
  }

  if ($totalApi -ne $totalEsperado) {
    throw "Divergencia: total calculado na API diferente do total esperado do seed."
  }
}

Write-Host "Importacao validada com sucesso."
