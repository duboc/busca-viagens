import {
  getPriceHistory,
  getAveragePriceByDayOfWeek,
  getMonthlyPriceMap,
  getAveragePriceByMonth,
} from '../db/repositories/PriceHistoryRepository';
import type { FarePrediction, BestTimeToBuyInfo } from '../agents/types';

const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

/**
 * Predict price trend for a specific route and departure date.
 * Uses simple moving average comparison: if recent avg > historical avg → rising.
 */
export async function predictPriceTrend(
  origin: string,
  destination: string,
  departureDate: string,
): Promise<FarePrediction> {
  const history = await getPriceHistory(origin, destination);

  if (history.length === 0) {
    return {
      trend: 'stable',
      confidence: 0.1,
      predictedPrice: 0,
      recommendation: 'Sem dados históricos suficientes para previsão.',
    };
  }

  // Filter prices for the same departure date
  const sameDatePrices = history.filter((h) => h.departureDate === departureDate);
  const allPrices = history.map((h) => h.price);

  // Overall historical average
  const historicalAvg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;

  // Recent prices: last 30% of entries (or at least last 3)
  const recentCount = Math.max(3, Math.floor(allPrices.length * 0.3));
  const recentPrices = allPrices.slice(-recentCount);
  const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;

  // Predicted price: use same-date average if available, otherwise use recent average
  const predictedPrice =
    sameDatePrices.length > 0
      ? sameDatePrices.reduce((a, b) => a + b.price, 0) / sameDatePrices.length
      : recentAvg;

  // Determine trend
  const changeRatio = (recentAvg - historicalAvg) / historicalAvg;
  let trend: FarePrediction['trend'];
  if (changeRatio > 0.05) {
    trend = 'rising';
  } else if (changeRatio < -0.05) {
    trend = 'falling';
  } else {
    trend = 'stable';
  }

  // Confidence based on data volume
  const confidence = Math.min(0.95, 0.3 + history.length * 0.05);

  // Recommendation
  let recommendation: string;
  switch (trend) {
    case 'rising':
      recommendation = 'Os preços estão subindo. Considere comprar em breve para garantir melhores tarifas.';
      break;
    case 'falling':
      recommendation = 'Os preços estão em queda. Pode valer a pena esperar um pouco mais para conseguir melhores ofertas.';
      break;
    case 'stable':
      recommendation = 'Os preços estão estáveis. É um bom momento para comprar se encontrar uma oferta dentro do seu orçamento.';
      break;
  }

  return {
    trend,
    confidence: Math.round(confidence * 100) / 100,
    predictedPrice: Math.round(predictedPrice * 100) / 100,
    recommendation,
  };
}

/**
 * Find the best day of week and cheapest months to buy tickets.
 */
export async function getBestTimeToBuy(
  origin: string,
  destination: string,
): Promise<BestTimeToBuyInfo> {
  const dayOfWeekData = await getAveragePriceByDayOfWeek(origin, destination);
  const monthData = await getAveragePriceByMonth(origin, destination);
  const allHistory = await getPriceHistory(origin, destination);

  // Default fallback
  if (dayOfWeekData.length === 0 && monthData.length === 0) {
    return {
      bestDayOfWeek: 2,
      bestDayName: 'Terça-feira',
      avgSavings: 0,
      cheapestMonths: [],
      priceRange: { min: 0, max: 0 },
    };
  }

  // Best day of week (lowest average)
  let bestDay = { dayOfWeek: 2, avgPrice: Infinity };
  const overallDayAvg =
    dayOfWeekData.length > 0
      ? dayOfWeekData.reduce((a, b) => a + b.avgPrice, 0) / dayOfWeekData.length
      : 0;

  for (const d of dayOfWeekData) {
    if (d.avgPrice < bestDay.avgPrice) {
      bestDay = d;
    }
  }

  const avgSavings = overallDayAvg > 0 ? Math.round(overallDayAvg - bestDay.avgPrice) : 0;

  // Cheapest months: sort by average price, take top 3
  const sortedMonths = [...monthData].sort((a, b) => a.avgPrice - b.avgPrice);
  const cheapestMonths = sortedMonths.slice(0, 3).map((m) => m.month);

  // Price range from all history
  const allPrices = allHistory.map((h) => h.price);
  const priceRange =
    allPrices.length > 0
      ? { min: Math.min(...allPrices), max: Math.max(...allPrices) }
      : { min: 0, max: 0 };

  return {
    bestDayOfWeek: bestDay.dayOfWeek,
    bestDayName: DAY_NAMES[bestDay.dayOfWeek] ?? 'Terça-feira',
    avgSavings,
    cheapestMonths,
    priceRange,
  };
}

/**
 * Get predictions for every day in a month.
 */
export async function getMonthPredictions(
  origin: string,
  destination: string,
  year: number,
  month: number,
): Promise<Record<number, FarePrediction>> {
  const priceMap = await getMonthlyPriceMap(origin, destination, year, month);
  const history = await getPriceHistory(origin, destination);
  const allPrices = history.map((h) => h.price);

  const historicalAvg =
    allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;

  const recentCount = Math.max(3, Math.floor(allPrices.length * 0.3));
  const recentPrices = allPrices.slice(-recentCount);
  const recentAvg =
    recentPrices.length > 0 ? recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length : 0;

  const changeRatio = historicalAvg > 0 ? (recentAvg - historicalAvg) / historicalAvg : 0;

  const predictions: Record<number, FarePrediction> = {};
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const price = priceMap[day];

    if (price !== undefined) {
      // Compare this day's price to historical average
      const dayChangeRatio = historicalAvg > 0 ? (price - historicalAvg) / historicalAvg : 0;
      let trend: FarePrediction['trend'];
      if (dayChangeRatio > 0.05) {
        trend = 'rising';
      } else if (dayChangeRatio < -0.05) {
        trend = 'falling';
      } else {
        trend = 'stable';
      }

      const confidence = Math.min(0.95, 0.3 + history.length * 0.05);

      let recommendation: string;
      switch (trend) {
        case 'rising':
          recommendation = 'Preço acima da média. Considere datas alternativas.';
          break;
        case 'falling':
          recommendation = 'Preço abaixo da média. Boa oportunidade!';
          break;
        case 'stable':
          recommendation = 'Preço dentro da média histórica.';
          break;
      }

      predictions[day] = {
        trend,
        confidence: Math.round(confidence * 100) / 100,
        predictedPrice: Math.round(price * 100) / 100,
        recommendation,
      };
    } else if (historicalAvg > 0) {
      // No price data for this specific day, use overall trend
      let trend: FarePrediction['trend'];
      if (changeRatio > 0.05) {
        trend = 'rising';
      } else if (changeRatio < -0.05) {
        trend = 'falling';
      } else {
        trend = 'stable';
      }

      predictions[day] = {
        trend,
        confidence: Math.max(0.1, Math.min(0.5, history.length * 0.03)),
        predictedPrice: Math.round(recentAvg * 100) / 100,
        recommendation: 'Previsão baseada em tendência geral da rota.',
      };
    }
  }

  return predictions;
}
