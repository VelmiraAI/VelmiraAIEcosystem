export interface PricePoint {
  timestamp: number
  price: number
  volume?: number
}

export interface TokenMetrics {
  averagePrice: number
  volatility: number      // standard deviation
  maxPrice: number
  minPrice: number
  priceChangePct: number
  averageVolume?: number
  dataPoints: number
}

export class TokenAnalysisCalculator {
  constructor(private data: PricePoint[]) {}

  getAveragePrice(): number {
    if (this.data.length === 0) return 0
    const sum = this.data.reduce((acc, p) => acc + p.price, 0)
    return sum / this.data.length
  }

  getVolatility(): number {
    if (this.data.length === 0) return 0
    const avg = this.getAveragePrice()
    const variance =
      this.data.reduce((acc, p) => acc + (p.price - avg) ** 2, 0) / this.data.length
    return Math.sqrt(variance)
  }

  getMaxPrice(): number {
    if (this.data.length === 0) return 0
    return this.data.reduce((max, p) => (p.price > max ? p.price : max), -Infinity)
  }

  getMinPrice(): number {
    if (this.data.length === 0) return 0
    return this.data.reduce((min, p) => (p.price < min ? p.price : min), Infinity)
  }

  getPriceChangePct(): number {
    if (this.data.length < 2) return 0
    const first = this.data[0].price
    const last = this.data[this.data.length - 1].price
    return ((last - first) / first) * 100
  }

  getAverageVolume(): number | undefined {
    const vols = this.data.map(d => d.volume).filter((v): v is number => v !== undefined)
    if (vols.length === 0) return undefined
    return vols.reduce((acc, v) => acc + v, 0) / vols.length
  }

  computeMetrics(): TokenMetrics {
    return {
      averagePrice: this.getAveragePrice(),
      volatility: this.getVolatility(),
      maxPrice: this.getMaxPrice(),
      minPrice: this.getMinPrice(),
      priceChangePct: Math.round(this.getPriceChangePct() * 100) / 100,
      averageVolume: this.getAverageVolume(),
      dataPoints: this.data.length,
    }
  }
}
