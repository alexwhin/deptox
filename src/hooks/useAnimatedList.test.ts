import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnimatedList } from "./useAnimatedList";

interface TestItem {
  id: string;
  name: string;
}

const getKey = (item: TestItem): string => item.id;

describe("useAnimatedList", () => {
  it("initializes with items mapped to animated items", () => {
    const items: TestItem[] = [
      { id: "1", name: "Item 1" },
      { id: "2", name: "Item 2" },
    ];

    const { result } = renderHook(() => useAnimatedList({ items, getKey }));

    expect(result.current.animatedItems).toHaveLength(2);
    expect(result.current.animatedItems[0]!.key).toBe("1");
    expect(result.current.animatedItems[0]!.isExiting).toBe(false);
    expect(result.current.animatedItems[0]!.item).toEqual(items[0]);
    expect(result.current.animatedItems[1]!.key).toBe("2");
    expect(result.current.animatedItems[1]!.isExiting).toBe(false);
  });

  it("handles empty initial items", () => {
    const items: TestItem[] = [];

    const { result } = renderHook(() => useAnimatedList({ items, getKey }));

    expect(result.current.animatedItems).toHaveLength(0);
  });

  it("adds new items without marking existing as exiting", () => {
    const initialItems: TestItem[] = [{ id: "1", name: "Item 1" }];

    const { result, rerender } = renderHook(
      ({ items }) => useAnimatedList({ items, getKey }),
      { initialProps: { items: initialItems } }
    );

    const updatedItems: TestItem[] = [
      { id: "1", name: "Item 1" },
      { id: "2", name: "Item 2" },
    ];

    rerender({ items: updatedItems });

    expect(result.current.animatedItems).toHaveLength(2);
    expect(result.current.animatedItems.every((item) => !item.isExiting)).toBe(
      true
    );
  });

  it("marks removed items as exiting", () => {
    const initialItems: TestItem[] = [
      { id: "1", name: "Item 1" },
      { id: "2", name: "Item 2" },
    ];

    const { result, rerender } = renderHook(
      ({ items }) => useAnimatedList({ items, getKey }),
      { initialProps: { items: initialItems } }
    );

    const updatedItems: TestItem[] = [{ id: "1", name: "Item 1" }];

    rerender({ items: updatedItems });

    expect(result.current.animatedItems).toHaveLength(2);

    const exitingItem = result.current.animatedItems.find(
      (item) => item.key === "2"
    );
    expect(exitingItem).toBeDefined();
    expect(exitingItem?.isExiting).toBe(true);

    const remainingItem = result.current.animatedItems.find(
      (item) => item.key === "1"
    );
    expect(remainingItem).toBeDefined();
    expect(remainingItem?.isExiting).toBe(false);
  });

  it("removes item from list when handleExitComplete is called", () => {
    const initialItems: TestItem[] = [
      { id: "1", name: "Item 1" },
      { id: "2", name: "Item 2" },
    ];

    const { result, rerender } = renderHook(
      ({ items }) => useAnimatedList({ items, getKey }),
      { initialProps: { items: initialItems } }
    );

    const updatedItems: TestItem[] = [{ id: "1", name: "Item 1" }];
    rerender({ items: updatedItems });

    expect(result.current.animatedItems).toHaveLength(2);

    act(() => {
      result.current.handleExitComplete("2");
    });

    expect(result.current.animatedItems).toHaveLength(1);
    expect(result.current.animatedItems[0]!.key).toBe("1");
  });

  it("handles multiple removals simultaneously", () => {
    const initialItems: TestItem[] = [
      { id: "1", name: "Item 1" },
      { id: "2", name: "Item 2" },
      { id: "3", name: "Item 3" },
    ];

    const { result, rerender } = renderHook(
      ({ items }) => useAnimatedList({ items, getKey }),
      { initialProps: { items: initialItems } }
    );

    const updatedItems: TestItem[] = [{ id: "2", name: "Item 2" }];
    rerender({ items: updatedItems });

    expect(result.current.animatedItems).toHaveLength(3);

    const exitingItems = result.current.animatedItems.filter(
      (item) => item.isExiting
    );
    expect(exitingItems).toHaveLength(2);
    expect(exitingItems.map((item) => item.key).sort()).toEqual(["1", "3"]);

    act(() => {
      result.current.handleExitComplete("1");
    });

    expect(result.current.animatedItems).toHaveLength(2);

    act(() => {
      result.current.handleExitComplete("3");
    });

    expect(result.current.animatedItems).toHaveLength(1);
    expect(result.current.animatedItems[0]!.key).toBe("2");
  });

  it("handles item updates without marking as exiting", () => {
    const initialItems: TestItem[] = [{ id: "1", name: "Item 1" }];

    const { result, rerender } = renderHook(
      ({ items }) => useAnimatedList({ items, getKey }),
      { initialProps: { items: initialItems } }
    );

    const updatedItems: TestItem[] = [{ id: "1", name: "Updated Item 1" }];
    rerender({ items: updatedItems });

    expect(result.current.animatedItems).toHaveLength(1);
    expect(result.current.animatedItems[0]!.item.name).toBe("Updated Item 1");
    expect(result.current.animatedItems[0]!.isExiting).toBe(false);
  });

  it("handles complete list replacement", () => {
    const initialItems: TestItem[] = [
      { id: "1", name: "Item 1" },
      { id: "2", name: "Item 2" },
    ];

    const { result, rerender } = renderHook(
      ({ items }) => useAnimatedList({ items, getKey }),
      { initialProps: { items: initialItems } }
    );

    const newItems: TestItem[] = [
      { id: "3", name: "Item 3" },
      { id: "4", name: "Item 4" },
    ];
    rerender({ items: newItems });

    expect(result.current.animatedItems).toHaveLength(4);

    const exitingItems = result.current.animatedItems.filter(
      (item) => item.isExiting
    );
    expect(exitingItems).toHaveLength(2);

    act(() => {
      result.current.handleExitComplete("1");
      result.current.handleExitComplete("2");
    });

    expect(result.current.animatedItems).toHaveLength(2);
    expect(result.current.animatedItems.map((item) => item.key).sort()).toEqual(
      ["3", "4"]
    );
  });

  it("tracks exiting items correctly across rerenders", () => {
    const initialItems: TestItem[] = [
      { id: "1", name: "Item 1" },
      { id: "2", name: "Item 2" },
    ];

    const { result, rerender } = renderHook(
      ({ items }) => useAnimatedList({ items, getKey }),
      { initialProps: { items: initialItems } }
    );

    rerender({ items: [{ id: "1", name: "Item 1" }] });

    const exitingCountAfterFirstRemoval = result.current.animatedItems.filter(
      (item) => item.isExiting
    ).length;
    expect(exitingCountAfterFirstRemoval).toBe(1);

    const exitingItem = result.current.animatedItems.find(
      (item) => item.key === "2"
    );
    expect(exitingItem?.isExiting).toBe(true);
  });

  it("handleExitComplete is stable across renders", () => {
    const items: TestItem[] = [{ id: "1", name: "Item 1" }];

    const { result, rerender } = renderHook(() =>
      useAnimatedList({ items, getKey })
    );

    const initialHandler = result.current.handleExitComplete;

    rerender();

    expect(result.current.handleExitComplete).toBe(initialHandler);
  });

  it("handles clearing all items", () => {
    const initialItems: TestItem[] = [
      { id: "1", name: "Item 1" },
      { id: "2", name: "Item 2" },
    ];

    const { result, rerender } = renderHook(
      ({ items }) => useAnimatedList({ items, getKey }),
      { initialProps: { items: initialItems } }
    );

    rerender({ items: [] });

    expect(result.current.animatedItems).toHaveLength(2);
    expect(result.current.animatedItems.every((item) => item.isExiting)).toBe(
      true
    );

    act(() => {
      result.current.handleExitComplete("1");
      result.current.handleExitComplete("2");
    });

    expect(result.current.animatedItems).toHaveLength(0);
  });

  it("preserves order of new items", () => {
    const initialItems: TestItem[] = [{ id: "2", name: "Item 2" }];

    const { result, rerender } = renderHook(
      ({ items }) => useAnimatedList({ items, getKey }),
      { initialProps: { items: initialItems } }
    );

    const updatedItems: TestItem[] = [
      { id: "1", name: "Item 1" },
      { id: "2", name: "Item 2" },
      { id: "3", name: "Item 3" },
    ];

    rerender({ items: updatedItems });

    const nonExitingItems = result.current.animatedItems.filter(
      (item) => !item.isExiting
    );
    expect(nonExitingItems.map((item) => item.key)).toEqual(["1", "2", "3"]);
  });
});
