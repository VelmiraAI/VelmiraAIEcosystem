from typing import List, Tuple, Dict, Any

def generate_activity_heatmap(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[float]:
    """
    Bucket activity counts into 'buckets' time intervals,
    returning either raw counts or normalized [0.0–1.0].
    - timestamps: list of epoch ms timestamps.
    - counts: list of integer counts per timestamp.
    """
    if not timestamps or not counts or len(timestamps) != len(counts):
        return []

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    agg = [0] * buckets
    for t, c in zip(timestamps, counts):
        idx = min(buckets - 1, int((t - t_min) / bucket_size))
        agg[idx] += c

    if normalize:
        m = max(agg) or 1
        return [round(val / m, 4) for val in agg]
    return agg


def heatmap_summary(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10
) -> Dict[str, Any]:
    """
    Extended summary of the heatmap:
    - raw buckets
    - normalized buckets
    - busiest bucket index and value
    - quietest bucket index and value
    """
    raw = generate_activity_heatmap(timestamps, counts, buckets, normalize=False)
    norm = generate_activity_heatmap(timestamps, counts, buckets, normalize=True)

    busiest_idx, busiest_val = max(enumerate(raw), key=lambda x: x[1], default=(None, 0))
    quietest_idx, quietest_val = min(enumerate(raw), key=lambda x: x[1], default=(None, 0))

    return {
        "raw": raw,
        "normalized": norm,
        "busiest": {"bucket": busiest_idx, "count": busiest_val},
        "quietest": {"bucket": quietest_idx, "count": quietest_val},
        "total_activity": sum(raw),
    }
