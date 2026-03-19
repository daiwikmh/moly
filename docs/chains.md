---
description: Supported chains and contract addresses
---

# Supported Chains

## Active Chains

### Hoodi Testnet

| Property | Value |
| --- | --- |
| Chain ID | `560048` |
| Type | Testnet |
| RPC | `https://hoodi.drpc.org` |

**Contracts:**

| Contract | Address |
| --- | --- |
| Lido / stETH | `0x3508A952176b3c15387C97BE809eaffB1982176a` |
| wstETH | `0x7E99eE3C66636DE415D2d7C880938F2f40f94De4` |
| Withdrawal Queue | `0xfe56573178f1bcdf53F01A6E9977670dcBBD9186` |
| Aragon Voting | `0x49B3512c44891bef83F8967d075121Bd1b07a01B` |
| LDO Token | `0xEf2573966D009CcEA0Fc74451dee2193564198dc` |
| Lido DAO Kernel | `0xA48DF029Fd2e5FCECB3886c5c2F60e3625A1E87d` |

Source: [docs.lido.fi/deployed-contracts/hoodi](https://docs.lido.fi/deployed-contracts/hoodi)

---

### Ethereum Mainnet

| Property | Value |
| --- | --- |
| Chain ID | `1` |
| Type | Mainnet |
| Read RPC | `https://eth.llamarpc.com` |
| Write RPC | Alchemy endpoint |

**Contracts:**

| Contract | Address |
| --- | --- |
| Lido / stETH | `0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84` |
| wstETH | `0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0` |
| Withdrawal Queue | `0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1` |
| Aragon Voting | `0x2e59A20f205bB85a89C53f1936454680651E618e` |
| LDO Token | `0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32` |
| Lido DAO Kernel | `0xb8FFC3Cd6e7Cf5a098A1c92F48009765B24088Dc` |
| Staking Router | `0xFdDf38947aFB03C621C71b06C9C70bce73f12999` |

Source: [docs.lido.fi/deployed-contracts](https://docs.lido.fi/deployed-contracts/)

---

## Lido on L2 (wstETH only)

Lido's wstETH is available on several L2 networks. These are **not yet supported** by Moly but listed for reference:

| Network | wstETH Address |
| --- | --- |
| Optimism | `0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb` |
| Arbitrum | `0x5979D7b546E38E414F7E9822514be443A4800529` |
| Base | `0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452` |
| Polygon PoS | `0x03b54A6e9a984069379fae1a4fC4dBAE93B3bCCD` |
| zkSync | `0x703b52F2b28fEbcB60E1372858AF5b18849FE867` |
| Scroll | `0xf610A9dfB7C89644979b4A0f27063E9e7d7Cda32` |
| Mantle | `0x458ed78EB972a369799fb278c0243b25e5242A83` |

---

## Deprecated

> **Holesky testnet is deprecated.** Moly previously used Holesky but has migrated to Hoodi. Do not use Holesky addresses.

---

Next: [Architecture](architecture.md)
