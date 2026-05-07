---
"react-doctor": minor
---

feat(react-doctor): add `no-effect-chain` rule

New rule (severity: `warn`) flagging the §7 anti-pattern from React's
[You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect#chains-of-computations)
guide:

```tsx
useEffect(() => { if (card?.gold) setGoldCount(c => c + 1); }, [card]);
useEffect(() => { if (goldCount > 3) setRound(r => r + 1); }, [goldCount]);
useEffect(() => { if (round > 5) setIsGameOver(true); }, [round]);
```

Each link adds an extra render to the tree below the component. The
chain is also rigid — setting `card` to a value from the past
re-fires every downstream effect.

The fix the article recommends is to compute as much as possible
during render (`const isGameOver = round > 5`) and write all related
state inside the event handler that originally fires the chain.

## Detector

For every component body:

1. Collect every top-level `useEffect` call and extract:
   - `depNames`: identifier names in the dep array
   - `writtenStateNames`: state names whose setter is called inside
   - `isExternalSync`: the effect returns a cleanup function OR
     contains a recognized external-system call (`subscribe`,
     `addEventListener`, `fetch`, `setInterval`, `new MutationObserver`,
     etc.) OR mutates a ref (`ref.current = …`)
2. For every ordered pair `(A, B)` of distinct effects, draw an edge
   iff `writes(A) ∩ deps(B) ≠ ∅` **and** neither `A` nor `B` is
   `isExternalSync`.
3. Report on every reader effect that is the target of any edge,
   naming the chained state.

## Complements `no-cascading-set-state`

`no-cascading-set-state` (already shipped) catches multi-setter calls
inside **one** effect. `no-effect-chain` catches chains **across**
effects. They detect orthogonal shapes and can fire independently.

## Article's GOOD exception

The article explicitly notes that a chain of effects is appropriate
when each effect synchronizes with the network (e.g. cascading
dropdowns where each fetches options for the next). Each fetch-bearing
effect has `isExternalSync = true` and is exempt — verified by a
regression test mirroring the `ShippingForm` example from
*Removing Effect Dependencies*.
