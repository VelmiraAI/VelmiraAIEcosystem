(async () => {
  // Environment overrides (if provided)
  const SOL_RPC = process.env.SOLANA_RPC_URL || "https://solana.rpc"
  const DEX_API = process.env.DEX_API_URL || "https://dex.api"
  const MINT = process.env.TOKEN_MINT || "MintPubkeyHere"
  const MARKET = process.env.MARKET_PUBKEY || "MarketPubkeyHere"

  // Simple timer utility
  const time = async <T>(label: string, fn: () => Promise<T>) => {
    const start = Date.now()
    try {
      const result = await fn()
      return { result, ms: Date.now() - start, label }
    } catch (error) {
      return { error: error as Error, ms: Date.now() - start, label }
    }
  }

  try {
    // 1) Analyze activity
    const activityAnalyzer = new TokenActivityAnalyzer(SOL_RPC)
    const activityRun = await time("activity", () =>
      activityAnalyzer.analyzeActivity(MINT, 20)
    )
    if ("error" in activityRun) throw activityRun.error
    const records = activityRun.result

    // 2) Analyze depth
    const depthAnalyzer = new TokenDepthAnalyzer(DEX_API, MARKET)
    const depthRun = await time("depth", () => depthAnalyzer.analyze(30))
    if ("error" in depthRun) throw depthRun.error
    const depthMetrics = depthRun.result

    // 3) Detect patterns (guard for minimal window)
    const volumes = records.map((r: any) => Number(r.amount) || 0)
    const minWindow = 5
    const patterns =
      volumes.length >= minWindow ? detectVolumePatterns(volumes, 5, 100) : []

    // 4) Execute a custom task
    const engine = new ExecutionEngine()
    engine.register("report", async (params) => ({
      records: params.records.length,
      totalVolume: params.records.reduce(
        (acc: number, r: any) => acc + (Number(r.amount) || 0),
        0
      ),
    }))
    engine.enqueue("task1", "report", { records })
    const taskResults = await engine.runAll()

    // 5) Sign the results
    const signer = new SigningEngine()
    const payloadObj = {
      depthMetrics,
      patterns,
      taskResults,
      performance: {
        activityMs: activityRun.ms,
        depthMs: depthRun.ms,
      },
      meta: {
        mint: MINT,
        market: MARKET,
        ts: new Date().toISOString(),
      },
    }
    const payload = JSON.stringify(payloadObj)
    const signature = await signer.sign(payload)
    const signatureValid = await signer.verify(payload, signature)

    if (!signatureValid) {
      throw new Error("Signature verification failed")
    }

    // Structured output
    const output = {
      recordsCount: records.length,
      depthMetrics,
      patterns,
      taskResults,
      signatureValid,
    }

    console.log(JSON.stringify(output, null, 2))
  } catch (err: any) {
    console.error(`Pipeline error: ${err?.message || String(err)}`)
    process.exitCode = 1
  }
})()
