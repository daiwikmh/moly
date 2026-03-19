---
description: Tools for Lido DAO governance
---

# Governance Tools

Lido is governed by LDO token holders via the Aragon Voting framework. These tools let you explore and participate in governance.

## How Lido Governance Works

```
LDO Holders ──► Aragon Voting Contract ──► Proposals
                                              │
                                         ┌────┴────┐
                                         │  YEA    │
                                         │  NAY    │
                                         └─────────┘
                                              │
                                     Pass if: support > threshold
                                              AND quorum met
```

- **LDO token** is the governance token
- Each proposal has a **snapshot block** — your voting power is based on LDO balance at that block
- Proposals are identified by **numeric ID**

---

## `get_proposals`

Covered in [Read Tools](read-tools.md#get_proposals). Lists recent proposals with status and vote totals.

## `get_proposal`

Covered in [Read Tools](read-tools.md#get_proposal). Returns full details including quorum and support thresholds.

---

## `cast_vote`

Vote on a Lido DAO proposal.

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `proposal_id` | number | Yes | The proposal ID |
| `support` | boolean | Yes | `true` for YEA, `false` for NAY |

**Simulation returns:**

```json
{
  "simulated": true,
  "network": "Ethereum Mainnet",
  "action": "cast_vote",
  "proposalId": 177,
  "vote": "YEA",
  "proposal": {
    "id": 177,
    "open": true,
    "yea": "45000000",
    "nay": "1200",
    "votingPower": "52000000"
  },
  "note": "Dry run — voting requires LDO tokens."
}
```

**Requirements:**
- Must hold **LDO tokens** at the proposal's snapshot block
- Proposal must be **open** (not yet closed or executed)
- One vote per address per proposal

**Example prompt:** _"Vote YEA on proposal 177"_

---

## Governance Contracts

| Network | Aragon Voting Address |
| --- | --- |
| Hoodi | `0x49B3512c44891bef83F8967d075121Bd1b07a01B` |
| Ethereum | `0x2e59A20f205bB85a89C53f1936454680651E618e` |

---

Next: [Stake ETH Guide](../guides/stake-eth.md)
