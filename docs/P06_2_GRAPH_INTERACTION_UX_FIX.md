# P-06.2 GRAPH INTERACTION UX FIX — CONTRACT EVALUATION

**Issue:** Manual browser review showed the minimal graph UI was readable but spatial interaction was poor.

Observed problems:
1. decorative diagonal fault line crossed content and reduced clarity;
2. nodes were effectively fixed to generated positions;
3. users could not arrange one node independently;
4. users could not select a subset and move only that subset;
5. automatic structural rerenders would have reset manual layout.

## UX decision

### Fault line

**REMOVED**

The diagonal line was purely decorative. It is not part of the knowledge model, triage state, dependency path, or domain rule.

Removing it improves readability without any semantic loss.

The geological direction remains through horizontal strata/bands and restrained material palette.

### Node dragging

**ENABLED**

Each reasoning card is independently draggable.

Dragging one ungrouped card updates only that card's UI position.

### Multi-selection

**ENABLED**

Users may:
- Ctrl-click multiple cards;
- Shift-click multiple cards;
- drag-select a rectangular subset;
- drag any selected card to move the selected group.

Unselected cards remain stationary.

### Manual layout persistence

**ENABLED AS EPHEMERAL UI STATE**

Dragged positions survive workspace/analysis rerenders for existing node IDs.

Newly created semantic nodes receive their default generated position.

Graph position is NOT persisted into `Workspace`, `KnowledgeItem`, relations, evaluation, triage, revisions, or audit.

Therefore card coordinates remain presentation state only.

## Authority and semantics

UNCHANGED.

Dragging/selecting does not:
- accept/reject knowledge;
- mutate reasoning text;
- add/remove relations;
- alter triage;
- alter evaluation;
- alter source metadata;
- change accepted conclusion.

## Edge editing

**DISABLED**

Cards are draggable but not connectable.

Users cannot accidentally create semantic relationships by dragging handles.

Relationship mutation remains outside P-06 UX scope.

## Contract impact

- schema: unchanged
- reasoning semantics: unchanged
- human authority: unchanged
- WebMCP scope: unchanged
- no automatic semantic rewiring: preserved

**CONTRACT CHANGES: NONE**

## Regression tests

Added 3 tests:
1. one-node drag leaves all other nodes stationary;
2. grouped drag changes only the selected subset;
3. manually arranged positions survive structural rerender.

Previous total: 76  
Expected total: **79 tests**
