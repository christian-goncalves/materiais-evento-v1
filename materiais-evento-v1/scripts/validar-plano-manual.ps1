param(
  [string]$BaseUrl = "http://localhost:3010",
  [switch]$SkipTruncate = $false
)

$ErrorActionPreference = "Stop"

function Convert-ToJsonSafe {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return $null }
  try { return $Text | ConvertFrom-Json } catch { return $null }
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    $Body = $null
  )

  $url = "$BaseUrl$Path"
  $jsonBody = $null
  if ($null -ne $Body) {
    $jsonBody = $Body | ConvertTo-Json -Depth 20
  }

  try {
    if ($null -ne $jsonBody) {
      $raw = Invoke-WebRequest -Method $Method -Uri $url -ContentType "application/json" -Body $jsonBody
    } else {
      $raw = Invoke-WebRequest -Method $Method -Uri $url
    }
    return [PSCustomObject]@{
      StatusCode = [int]$raw.StatusCode
      Json = Convert-ToJsonSafe -Text $raw.Content
      Raw = $raw.Content
    }
  } catch {
    $resp = $_.Exception.Response
    if (-not $resp) { throw }

    $code = [int]$resp.StatusCode
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $content = $reader.ReadToEnd()
    return [PSCustomObject]@{
      StatusCode = $code
      Json = Convert-ToJsonSafe -Text $content
      Raw = $content
    }
  }
}

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )
  if (-not $Condition) {
    throw $Message
  }
}

function Assert-Status {
  param(
    $Response,
    [int]$ExpectedStatus,
    [string]$Context
  )
  Assert-True -Condition ($Response.StatusCode -eq $ExpectedStatus) -Message "${Context}: status esperado=$ExpectedStatus recebido=$($Response.StatusCode) body=$($Response.Raw)"
}

function Get-GlobalSaldo {
  param($Resumo, [string]$MaterialId)
  $entry = @($Resumo.global | Where-Object { $_.material_id -eq $MaterialId })[0]
  if (-not $entry) { return 0 }
  return [int]$entry.saldo
}

function Get-CompSaldo {
  param($Resumo, [string]$CompanheiroId, [string]$MaterialId)
  $comp = @($Resumo.companheiros | Where-Object { $_.id -eq $CompanheiroId })[0]
  if (-not $comp) { return 0 }
  $entry = @($comp.saldos | Where-Object { $_.material_id -eq $MaterialId })[0]
  if (-not $entry) { return 0 }
  return [int]$entry.saldo
}

Write-Host "=== VALIDACAO AUTOMATIZADA DO PLANO MANUAL ==="
Write-Host "Base URL: $BaseUrl"

if (-not $SkipTruncate) {
  $truncate = Invoke-Api -Method "POST" -Path "/api/admin/truncate-transacional"
  Assert-Status -Response $truncate -ExpectedStatus 200 -Context "truncate transacional"
  Assert-True -Condition ($truncate.Json.after.pedidos -eq 0) -Message "pos-truncate: pedidos nao zerado"
  Assert-True -Condition ($truncate.Json.after.pedido_itens -eq 0) -Message "pos-truncate: pedido_itens nao zerado"
  Assert-True -Condition ($truncate.Json.after.estoque -eq 0) -Message "pos-truncate: estoque nao zerado"
  Assert-True -Condition ($truncate.Json.after.financeiro -eq 0) -Message "pos-truncate: financeiro nao zerado"
  Write-Host "[OK] Truncamento transacional"
}

# Sanidade inicial
$materiaisResp = Invoke-Api -Method "GET" -Path "/api/materiais"
Assert-Status -Response $materiaisResp -ExpectedStatus 200 -Context "GET /api/materiais"
$materiais = @($materiaisResp.Json)
$camiseta = @($materiais | Where-Object { $_.id -eq 'camiseta' })[0]
$caneca = @($materiais | Where-Object { $_.id -eq 'caneca' })[0]
Assert-True -Condition ($null -ne $camiseta) -Message "material camiseta nao encontrado"
Assert-True -Condition ($null -ne $caneca) -Message "material caneca nao encontrado"
Assert-True -Condition ([int]$camiseta.preco -eq 50) -Message "preco camiseta diferente de 50"
Assert-True -Condition ([int]$caneca.preco -eq 35) -Message "preco caneca diferente de 35"

$companheirosResp = Invoke-Api -Method "GET" -Path "/api/companheiros"
Assert-Status -Response $companheirosResp -ExpectedStatus 200 -Context "GET /api/companheiros"
$hugo = @($companheirosResp.Json.companheiros | Where-Object { $_.id -eq 'hugo' -and $_.ativo -eq $true })[0]
Assert-True -Condition ($null -ne $hugo) -Message "companheiro hugo ativo nao encontrado"
Write-Host "[OK] Sanidade inicial"

# Cenario 2 - entrada global
$entrada1 = Invoke-Api -Method "POST" -Path "/api/estoque/entrada" -Body @{
  material_id = "camiseta"; tipo = "entrada"; quantidade = 20; origem = "qa_manual";
}
Assert-Status -Response $entrada1 -ExpectedStatus 200 -Context "entrada camiseta"
$entrada2 = Invoke-Api -Method "POST" -Path "/api/estoque/entrada" -Body @{
  material_id = "caneca"; tipo = "entrada"; quantidade = 10; origem = "qa_manual";
}
Assert-Status -Response $entrada2 -ExpectedStatus 200 -Context "entrada caneca"

$resumoResp = Invoke-Api -Method "GET" -Path "/api/estoque/resumo"
Assert-Status -Response $resumoResp -ExpectedStatus 200 -Context "resumo apos entradas"
Assert-True -Condition ((Get-GlobalSaldo $resumoResp.Json "camiseta") -eq 20) -Message "global camiseta esperado=20"
Assert-True -Condition ((Get-GlobalSaldo $resumoResp.Json "caneca") -eq 10) -Message "global caneca esperado=10"
Write-Host "[OK] Cenario 2"

# Cenario 3 - transferencia para companheiro
$t1 = Invoke-Api -Method "POST" -Path "/api/estoque/entrada" -Body @{
  material_id = "camiseta"; tipo = "transferencia_companheiro"; quantidade = 5; origem = "qa_manual"; companheiro_id = "hugo"; destino_tipo = "companheiro";
}
Assert-Status -Response $t1 -ExpectedStatus 200 -Context "transferencia camiseta"
$t2 = Invoke-Api -Method "POST" -Path "/api/estoque/entrada" -Body @{
  material_id = "caneca"; tipo = "transferencia_companheiro"; quantidade = 3; origem = "qa_manual"; companheiro_id = "hugo"; destino_tipo = "companheiro";
}
Assert-Status -Response $t2 -ExpectedStatus 200 -Context "transferencia caneca"

$resumoResp = Invoke-Api -Method "GET" -Path "/api/estoque/resumo"
Assert-Status -Response $resumoResp -ExpectedStatus 200 -Context "resumo apos transferencias"
Assert-True -Condition ((Get-GlobalSaldo $resumoResp.Json "camiseta") -eq 15) -Message "global camiseta esperado=15"
Assert-True -Condition ((Get-GlobalSaldo $resumoResp.Json "caneca") -eq 7) -Message "global caneca esperado=7"
Assert-True -Condition ((Get-CompSaldo $resumoResp.Json "hugo" "camiseta") -eq 5) -Message "hugo camiseta esperado=5"
Assert-True -Condition ((Get-CompSaldo $resumoResp.Json "hugo" "caneca") -eq 3) -Message "hugo caneca esperado=3"
Write-Host "[OK] Cenario 3"

# Cenario 4 - criar pedido
$pedidoAtual = @{
  id = 1
  nome = "QA Pedido"
  data = (Get-Date).ToString("dd/MM/yyyy")
  tel = ""
  itens = @{ camiseta = 2; caneca = 1 }
  companheiro_por_item = @{ camiseta = "hugo"; caneca = "hugo" }
  pago = "Não"
  pagData = ""
}
$putCreate = Invoke-Api -Method "PUT" -Path "/api/pedidos" -Body @{ pedidos = @($pedidoAtual) }
Assert-Status -Response $putCreate -ExpectedStatus 200 -Context "PUT criar pedido"

$pedidosResp = Invoke-Api -Method "GET" -Path "/api/pedidos"
Assert-Status -Response $pedidosResp -ExpectedStatus 200 -Context "GET pedidos apos criar"
Assert-True -Condition (@($pedidosResp.Json.pedidos).Count -eq 1) -Message "apos criar: total pedidos esperado=1"
$p1 = $pedidosResp.Json.pedidos[0]
Assert-True -Condition ([int]$p1.itens.camiseta -eq 2 -and [int]$p1.itens.caneca -eq 1) -Message "itens do pedido criado divergentes"
$total = ([int]$p1.itens.camiseta * 50) + ([int]$p1.itens.caneca * 35)
Assert-True -Condition ($total -eq 135) -Message "total pedido criado esperado=135"

$resumoResp = Invoke-Api -Method "GET" -Path "/api/estoque/resumo"
Assert-True -Condition ((Get-GlobalSaldo $resumoResp.Json "camiseta") -eq 13) -Message "global camiseta esperado=13 apos criar pedido"
Assert-True -Condition ((Get-GlobalSaldo $resumoResp.Json "caneca") -eq 6) -Message "global caneca esperado=6 apos criar pedido"
Write-Host "[OK] Cenario 4"

# Cenario 5 - editar pedido
$pedidoAtual.itens = @{ camiseta = 3; caneca = 1 }
$putEdit = Invoke-Api -Method "PUT" -Path "/api/pedidos" -Body @{ pedidos = @($pedidoAtual) }
Assert-Status -Response $putEdit -ExpectedStatus 200 -Context "PUT editar pedido"

$pedidosResp = Invoke-Api -Method "GET" -Path "/api/pedidos"
$p1 = $pedidosResp.Json.pedidos[0]
$total = ([int]$p1.itens.camiseta * 50) + ([int]$p1.itens.caneca * 35)
Assert-True -Condition ($total -eq 185) -Message "total pedido editado esperado=185"

$resumoResp = Invoke-Api -Method "GET" -Path "/api/estoque/resumo"
Assert-True -Condition ((Get-GlobalSaldo $resumoResp.Json "camiseta") -eq 12) -Message "global camiseta esperado=12 apos editar"
Assert-True -Condition ((Get-GlobalSaldo $resumoResp.Json "caneca") -eq 6) -Message "global caneca esperado=6 apos editar"
Write-Host "[OK] Cenario 5"

# Cenario 6 - marcar pago
$pedidoAtual.pago = "Sim"
$putPago = Invoke-Api -Method "PUT" -Path "/api/pedidos" -Body @{ pedidos = @($pedidoAtual) }
Assert-Status -Response $putPago -ExpectedStatus 200 -Context "PUT marcar pago"
$pedidosResp = Invoke-Api -Method "GET" -Path "/api/pedidos"
$p1 = $pedidosResp.Json.pedidos[0]
Assert-True -Condition ($p1.pago -eq "Sim") -Message "pedido nao foi marcado como pago"
$totalGeral = ([int]$p1.itens.camiseta * 50) + ([int]$p1.itens.caneca * 35)
$totalRecebido = if ($p1.pago -eq "Sim") { $totalGeral } else { 0 }
$totalPendente = $totalGeral - $totalRecebido
Assert-True -Condition ($totalGeral -eq 185 -and $totalRecebido -eq 185 -and $totalPendente -eq 0) -Message "resumo de pagamento divergente"
Write-Host "[OK] Cenario 6"

# Cenario 7 - excluir pedido
$putDelete = Invoke-Api -Method "PUT" -Path "/api/pedidos" -Body @{ pedidos = @() }
Assert-Status -Response $putDelete -ExpectedStatus 200 -Context "PUT excluir pedido"
$pedidosResp = Invoke-Api -Method "GET" -Path "/api/pedidos"
Assert-True -Condition (@($pedidosResp.Json.pedidos).Count -eq 0) -Message "apos excluir: pedidos deveria estar vazio"

$resumoResp = Invoke-Api -Method "GET" -Path "/api/estoque/resumo"
Assert-True -Condition ((Get-GlobalSaldo $resumoResp.Json "camiseta") -eq 15) -Message "global camiseta esperado=15 apos excluir"
Assert-True -Condition ((Get-GlobalSaldo $resumoResp.Json "caneca") -eq 7) -Message "global caneca esperado=7 apos excluir"
Write-Host "[OK] Cenario 7"

# Cenario 8 - venda de companheiro + financeiro
$venda = Invoke-Api -Method "POST" -Path "/api/estoque/entrada" -Body @{
  material_id = "camiseta"; tipo = "venda_companheiro"; quantidade = 2; origem = "qa_manual"; companheiro_id = "hugo"; destino_tipo = "cliente_final";
}
Assert-Status -Response $venda -ExpectedStatus 200 -Context "venda companheiro"
$financeiroId = [int]$venda.Json.financeiro.id
Assert-True -Condition ($financeiroId -gt 0) -Message "financeiro.id invalido na venda"

$financeiroResp = Invoke-Api -Method "GET" -Path "/api/financeiro"
Assert-Status -Response $financeiroResp -ExpectedStatus 200 -Context "GET financeiro apos venda"
$fin = @($financeiroResp.Json.financeiro | Where-Object { [int]$_.id -eq $financeiroId })[0]
Assert-True -Condition ($null -ne $fin) -Message "lancamento financeiro nao encontrado"
Assert-True -Condition ($fin.status_repasse -eq "pendente") -Message "status_repasse esperado=pendente"
Assert-True -Condition ([int]$fin.valor_unitario -eq 50) -Message "valor_unitario esperado=50"
Assert-True -Condition ([int]$fin.valor_total -eq 100) -Message "valor_total esperado=100"

$resumoResp = Invoke-Api -Method "GET" -Path "/api/estoque/resumo"
Assert-True -Condition ((Get-GlobalSaldo $resumoResp.Json "camiseta") -eq 13) -Message "global camiseta esperado=13 apos venda"
Assert-True -Condition ((Get-CompSaldo $resumoResp.Json "hugo" "camiseta") -eq 3) -Message "hugo camiseta esperado=3 apos venda"
Write-Host "[OK] Cenario 8"

# Cenario 9 - repasse financeiro
$repasse = Invoke-Api -Method "PATCH" -Path "/api/financeiro/$financeiroId/repasse"
Assert-Status -Response $repasse -ExpectedStatus 200 -Context "PATCH repasse"
Assert-True -Condition ($repasse.Json.status_repasse -eq "repassado") -Message "patch repasse sem status esperado"

$financeiroResp = Invoke-Api -Method "GET" -Path "/api/financeiro"
$fin = @($financeiroResp.Json.financeiro | Where-Object { [int]$_.id -eq $financeiroId })[0]
Assert-True -Condition ($fin.status_repasse -eq "repassado") -Message "status final do financeiro deveria ser repassado"
Write-Host "[OK] Cenario 9"

# Cenario 10 - negativos
$negPedido = Invoke-Api -Method "PUT" -Path "/api/pedidos" -Body @{
  pedidos = @(
    @{
      id = 2
      nome = "Pedido sem companheiro"
      data = (Get-Date).ToString("dd/MM/yyyy")
      tel = ""
      itens = @{ camiseta = 1 }
      companheiro_por_item = @{}
      pago = "Não"
      pagData = ""
    }
  )
}
Assert-True -Condition ($negPedido.StatusCode -eq 400) -Message "negativo pedido sem companheiro deveria retornar 400"
Assert-True -Condition ($negPedido.Raw -match "companheiro_id obrigatorio") -Message "mensagem esperada para pedido sem companheiro"

$negTransferencia = Invoke-Api -Method "POST" -Path "/api/estoque/entrada" -Body @{
  material_id = "camiseta"; tipo = "transferencia_companheiro"; quantidade = 999; origem = "qa_negativo"; companheiro_id = "hugo";
}
Assert-True -Condition ($negTransferencia.StatusCode -eq 400) -Message "negativo transferencia acima do saldo deveria retornar 400"
Assert-True -Condition ($negTransferencia.Raw -match "Estoque global insuficiente") -Message "mensagem esperada para transferencia acima do saldo global"

$negVendaComp = Invoke-Api -Method "POST" -Path "/api/estoque/entrada" -Body @{
  material_id = "camiseta"; tipo = "venda_companheiro"; quantidade = 4; origem = "qa_negativo"; companheiro_id = "hugo";
}
Assert-True -Condition ($negVendaComp.StatusCode -eq 400) -Message "negativo venda acima do saldo do companheiro deveria retornar 400"
Assert-True -Condition ($negVendaComp.Raw -match "Saldo do companheiro insuficiente") -Message "mensagem esperada para venda acima do saldo do companheiro"

$negQtd = Invoke-Api -Method "POST" -Path "/api/estoque/entrada" -Body @{
  material_id = "camiseta"; tipo = "entrada"; quantidade = 0; origem = "qa_negativo";
}
Assert-True -Condition ($negQtd.StatusCode -eq 400) -Message "negativo quantidade zero deveria retornar 400"
Assert-True -Condition ($negQtd.Raw -match "quantidade invalida") -Message "mensagem esperada para quantidade invalida"
Write-Host "[OK] Cenario 10"

Write-Host "=== RESULTADO: TODOS OS CENARIOS VALIDADOS COM SUCESSO ==="

