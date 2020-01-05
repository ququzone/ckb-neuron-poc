Http service
============

## Install

```
npm run server:dev
```

## Endpoint

### 1. get all rules

```bash
curl -XGET http://localhost:3000/rules
```

### 2. add rule

Supported rule name:
  - LockCodeHash
  - LockHash
  - TypeCodeHash
  - TypeHash

```bash
curl -XPOST http://localhost:3000/rule \
-H "Content-Type: application/json" -d '
{
  "name": "LockHash",
  "value": "0xcd64ecc1fa2570073cbe9b2dfda7974288b564f323b4cd07e9d84fef22d62661"
}
'
```

### 3. query live cells

```bash
curl -XGET http://localhost:3000/cells?lockHash=0x6a242b57227484e904b4e08ba96f19a623c367dcbd18675ec6f2a71a0ff4ec26
curl -XGET http://localhost:3000/cells?typeCodeHash=0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e
```

### 4. Reset start blockNumber

```bash
curl -XPOST http://localhost:3000/reset \
-H "Content-Type: application/json" -d '
{
  "blockNumber": "58011"
}
'
```

## Run plugins

```
npm run script src/plugin/secp256k1-single-http.ts
```