export function toggleSetItem<T>(set: Set<T>, item: T): Set<T> {
  const newSet = new Set(set);
  if (newSet.has(item)) {
    newSet.delete(item);
  } else {
    newSet.add(item);
  }
  return newSet;
}

export function addToSet<T>(set: Set<T>, item: T): Set<T> {
  return new Set(set).add(item);
}

export function removeFromSet<T>(set: Set<T>, item: T): Set<T> {
  const newSet = new Set(set);
  newSet.delete(item);
  return newSet;
}
