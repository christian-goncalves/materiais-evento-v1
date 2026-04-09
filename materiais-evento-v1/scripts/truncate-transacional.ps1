param(
  [string]$BaseUrl = "http://localhost:3010",
  [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

$url = "$BaseUrl/api/admin/truncate-transacional"
if ($DryRun) {
  $url = "$url?dry_run=true"
}

Write-Host "POST $url"
$resp = Invoke-RestMethod -Method POST -Uri $url

if (-not $resp.ok) {
  throw "Falha no truncate transacional."
}

Write-Host "----- SNAPSHOT ANTES -----"
Write-Host ("pedidos: {0}" -f $resp.before.pedidos)
Write-Host ("pedido_itens: {0}" -f $resp.before.pedido_itens)
Write-Host ("estoque: {0}" -f $resp.before.estoque)
Write-Host ("estoque_saida_pedido: {0}" -f $resp.before.estoque_saida_pedido)
Write-Host ("financeiro: {0}" -f $resp.before.financeiro)

Write-Host "----- SNAPSHOT DEPOIS -----"
Write-Host ("pedidos: {0}" -f $resp.after.pedidos)
Write-Host ("pedido_itens: {0}" -f $resp.after.pedido_itens)
Write-Host ("estoque: {0}" -f $resp.after.estoque)
Write-Host ("estoque_saida_pedido: {0}" -f $resp.after.estoque_saida_pedido)
Write-Host ("financeiro: {0}" -f $resp.after.financeiro)

if (-not $DryRun) {
  if (
    ($resp.after.pedidos -ne 0) -or
    ($resp.after.pedido_itens -ne 0) -or
    ($resp.after.estoque -ne 0) -or
    ($resp.after.financeiro -ne 0)
  ) {
    throw "Truncate concluiu com divergencia: ainda existem linhas nas abas transacionais."
  }
}

Write-Host "Truncate transacional concluido."
