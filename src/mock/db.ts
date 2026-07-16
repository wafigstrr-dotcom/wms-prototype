/**
 * Mock 数据持久化层
 * 基于 LocalForage（IndexedDB）实现浏览器端异步存储
 * 每个 Db 类对应一个 localforage 实例，数据以 JSON 数组形式存储在单个 key 下
 */
import localforage from 'localforage'
import type { User, InventoryItem, Flow, Warehouse, Location } from '../types'

// ==================== 通用存储工厂 ====================
function createStore<T>(name: string) {
  const store = localforage.createInstance({ name: 'jci_mock', storeName: name })

  async function readAll(): Promise<T[]> {
    const data = await store.getItem<T[]>('data')
    return data ?? []
  }

  async function writeAll(data: T[]): Promise<void> {
    await store.setItem('data', data)
  }

  return { readAll, writeAll, store }
}

// ==================== 种子数据 ====================
const seedUsers: User[] = [
  { id: 1, gid: 'G00001',   password: 'admin123', name: '系统管理员', email: 'admin@jci.com',         role: 'admin',    department: 'IT部' },
  { id: 2, gid: 'czhuzz',   password: '123456',   name: '朱智国',    email: 'zhiguo.zg.zhu@jci.com', role: 'engineer', department: '零部件测试' },
  { id: 3, gid: 'CLIU250',  password: '123456',   name: '刘京广',    email: 'jingguang.liu@jci.com', role: 'admin',    department: 'EE' },
  { id: 4, gid: 'JFANGUA',  password: '123456',   name: '范广武',    email: 'guangwu.fan@jci.com',   role: 'keeper',   department: 'EE' },
  { id: 5, gid: 'JQIAOL1',  password: '123456',   name: '乔黎明',    email: 'liming.1.qiao@jci.com', role: 'keeper',   department: 'EE' },
  { id: 6, gid: 'CKONGKEE', password: '123456',   name: '孔留网',    email: 'Kevin.kong@jci.com',    role: 'engineer', department: '零部件测试' },
]

const seedWarehouses: Warehouse[] = [
  { id: 1, name: 'A', location: '一号厂房东侧', attribute: '室内/封闭', type: '货架', createTime: '2025-01-10T08:00:00.000Z' },
  { id: 2, name: 'B', location: '一号厂房西侧', attribute: '室内/半封闭', type: '货架+地面', createTime: '2025-01-10T08:00:00.000Z' },
  { id: 3, name: 'C', location: '二号厂房南侧', attribute: '室外/封闭', type: '地面', createTime: '2025-02-15T08:00:00.000Z' },
  { id: 4, name: 'D', location: '二号厂房北侧', attribute: '室外/半封闭', type: '货架', createTime: '2025-03-20T08:00:00.000Z' },
]

const seedLocations: Location[] = [
  { id: 101, warehouseName: 'A', locationCode: 'A-01-01', manager: '范广武', size: '2m x 1.5m x 1.8m', createTime: '2025-01-11T08:00:00.000Z' },
  { id: 102, warehouseName: 'A', locationCode: 'A-01-02', manager: '范广武', size: '2m x 1.5m x 1.8m', createTime: '2025-01-11T08:00:00.000Z' },
  { id: 103, warehouseName: 'A', locationCode: 'A-02-01', manager: '乔黎明', size: '2.5m x 1.5m x 2m', createTime: '2025-01-11T08:00:00.000Z' },
  { id: 104, warehouseName: 'B', locationCode: 'B-01-01', manager: '乔黎明', size: '3m x 2m x 2m', createTime: '2025-01-12T08:00:00.000Z' },
  { id: 105, warehouseName: 'B', locationCode: 'B-01-02', manager: '乔黎明', size: '3m x 2m x 2m', createTime: '2025-01-12T08:00:00.000Z' },
  { id: 106, warehouseName: 'C', locationCode: 'C-01-01', manager: '范广武', size: '5m x 3m x 0m', createTime: '2025-02-16T08:00:00.000Z' },
  { id: 107, warehouseName: 'C', locationCode: 'C-02-01', manager: '范广武', size: '5m x 3m x 0m', createTime: '2025-02-16T08:00:00.000Z' },
  { id: 108, warehouseName: 'D', locationCode: 'D-01-01', manager: '乔黎明', size: '2m x 1.5m x 1.8m', createTime: '2025-03-21T08:00:00.000Z' },
  { id: 109, warehouseName: 'D', locationCode: 'D-01-02', manager: '乔黎明', size: '2m x 1.5m x 1.8m', createTime: '2025-03-21T08:00:00.000Z' },
]

/** 初始化种子数据（应用启动时调用一次） */
export async function ensureSeed(): Promise<void> {
  const usersStore = createStore<User>('users')
  const existing = await usersStore.readAll()
  if (existing.length === 0) {
    await usersStore.writeAll(seedUsers)
  }
  // 仓库种子
  const whStore = createStore<Warehouse>('warehouses')
  const whData = await whStore.readAll()
  if (whData.length === 0) await whStore.writeAll(seedWarehouses)
  // 库位种子
  const locStore = createStore<Location>('locations')
  const locData = await locStore.readAll()
  if (locData.length === 0) await locStore.writeAll(seedLocations)
  // 其余集合若不存在则初始化为空数组
  for (const name of ['inventory', 'flows', 'auction']) {
    const s = createStore<unknown>(name)
    const data = await s.readAll()
    if (data.length === 0) await s.writeAll([])
  }
}

// ==================== Users ====================
const usersStore = createStore<User>('users')

export const UsersDb = {
  async getAll(): Promise<User[]> {
    const users = await usersStore.readAll()
    const list = users.length > 0 ? users : seedUsers
    return list.filter(u => !u.isDeleted)
  },
  async add(user: Omit<User, 'id'>): Promise<User> {
    const users = await usersStore.readAll()
    const now = new Date().toISOString()
    const newUser = { ...user, id: Date.now(), updatedAt: now, isDeleted: false } as User
    users.push(newUser)
    await usersStore.writeAll(users)
    return newUser
  },
  async update(id: number, updates: Partial<User>): Promise<User | null> {
    const users = await usersStore.readAll()
    const idx = users.findIndex(u => u.id === id)
    if (idx === -1) return null
    users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() }
    await usersStore.writeAll(users)
    return users[idx]
  },
  // 软删除：置 isDeleted 标记，不做物理删除
  async remove(id: number): Promise<boolean> {
    const users = await usersStore.readAll()
    const idx = users.findIndex(u => u.id === id)
    if (idx === -1) return false
    users[idx] = { ...users[idx], isDeleted: true, updatedAt: new Date().toISOString() }
    await usersStore.writeAll(users)
    return true
  },
}

// ==================== Inventory ====================
const inventoryStore = createStore<InventoryItem>('inventory')

export const InventoryDb = {
  async getAll(): Promise<InventoryItem[]> {
    const items = await inventoryStore.readAll()
    return items.filter(i => !i.isDeleted)
  },
  async add(item: Omit<InventoryItem, 'id' | 'inboundNo' | 'inboundTime' | 'remainingStock' | 'agingDays' | 'dormantDays'>): Promise<InventoryItem> {
    const items = await inventoryStore.readAll()
    const now = new Date().toISOString()
    const newItem: InventoryItem = {
      ...item,
      id: Date.now(),
      inboundNo: `SYS-${Date.now()}`,
      inboundTime: now,
      remainingStock: item.quantity,
      agingDays: 0,
      dormantDays: 0,
      updatedAt: now,
      isDeleted: false,
    }
    items.push(newItem)
    await inventoryStore.writeAll(items)
    return newItem
  },
  async update(id: number, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
    const items = await inventoryStore.readAll()
    const idx = items.findIndex(i => i.id === id)
    if (idx === -1) return null
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() }
    await inventoryStore.writeAll(items)
    return items[idx]
  },
}

// ==================== Flows ====================
const flowsStore = createStore<Flow>('flows')

export const FlowsDb = {
  async getAll(): Promise<Flow[]> {
    const flows = await flowsStore.readAll()
    return flows.filter(f => !f.isDeleted)
  },
  async add(flow: Omit<Flow, 'id' | 'flowNo' | 'createTime' | 'approvalHistory' | 'approveTime' | 'approveComment'>): Promise<Flow> {
    const flows = await flowsStore.readAll()
    const prefix: Record<string, string> = {
      inbound_engineer: 'FLOW', outbound_request: 'REQ', outbound_scrap: 'SCRAP',
      transfer: 'TRANS', express: 'EXP', scrap_workflow: 'SCRAPWF',
    }
    const now = new Date().toISOString()
    const newFlow: Flow = {
      ...flow,
      id: Date.now(),
      flowNo: `${prefix[flow.type] || 'FLOW'}-${Date.now()}`,
      createTime: now,
      approvalHistory: [],
      approveTime: null,
      approveComment: '',
      updatedAt: now,
      isDeleted: false,
    }
    flows.push(newFlow)
    await flowsStore.writeAll(flows)
    return newFlow
  },
  async update(id: number, updates: Partial<Flow>): Promise<Flow | null> {
    const flows = await flowsStore.readAll()
    const idx = flows.findIndex(f => f.id === id)
    if (idx === -1) return null
    flows[idx] = { ...flows[idx], ...updates, updatedAt: new Date().toISOString() }
    await flowsStore.writeAll(flows)
    return flows[idx]
  },
}

// ==================== Warehouses ====================
const warehousesStore = createStore<Warehouse>('warehouses')

export const WarehousesDb = {
  async getAll(): Promise<Warehouse[]> {
    const items = await warehousesStore.readAll()
    return items.filter(w => !w.isDeleted)
  },
  async add(item: Omit<Warehouse, 'id' | 'createTime'>): Promise<Warehouse> {
    const items = await warehousesStore.readAll()
    const now = new Date().toISOString()
    const newItem = { ...item, id: Date.now(), createTime: now, updatedAt: now, isDeleted: false } as Warehouse
    items.push(newItem)
    await warehousesStore.writeAll(items)
    return newItem
  },
  async update(id: number, updates: Partial<Warehouse>): Promise<Warehouse | null> {
    const items = await warehousesStore.readAll()
    const idx = items.findIndex(i => i.id === id)
    if (idx === -1) return null
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() }
    await warehousesStore.writeAll(items)
    return items[idx]
  },
  // 软删除
  async remove(id: number): Promise<boolean> {
    const items = await warehousesStore.readAll()
    const idx = items.findIndex(i => i.id === id)
    if (idx === -1) return false
    items[idx] = { ...items[idx], isDeleted: true, updatedAt: new Date().toISOString() }
    await warehousesStore.writeAll(items)
    return true
  },
}

// ==================== Locations ====================
const locationsStore = createStore<Location>('locations')

export const LocationsDb = {
  async getAll(): Promise<Location[]> {
    const items = await locationsStore.readAll()
    return items.filter(l => !l.isDeleted)
  },
  async add(item: Omit<Location, 'id' | 'createTime'>): Promise<Location> {
    const items = await locationsStore.readAll()
    const now = new Date().toISOString()
    const newItem = { ...item, id: Date.now(), createTime: now, updatedAt: now, isDeleted: false } as Location
    items.push(newItem)
    await locationsStore.writeAll(items)
    return newItem
  },
  async update(id: number, updates: Partial<Location>): Promise<Location | null> {
    const items = await locationsStore.readAll()
    const idx = items.findIndex(i => i.id === id)
    if (idx === -1) return null
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() }
    await locationsStore.writeAll(items)
    return items[idx]
  },
  // 软删除
  async remove(id: number): Promise<boolean> {
    const items = await locationsStore.readAll()
    const idx = items.findIndex(i => i.id === id)
    if (idx === -1) return false
    items[idx] = { ...items[idx], isDeleted: true, updatedAt: new Date().toISOString() }
    await locationsStore.writeAll(items)
    return true
  },
}

// ==================== Auction ====================
// 拍卖文件存档：key = fileId，value = 该文件位的多文件数组
export interface AuctionFile {
  fileName: string
  fileSize: number
  uploadTime: string
}
export type AuctionData = Record<string, AuctionFile[]>

const auctionStore = createStore<AuctionData>('auction')

export const AuctionDb = {
  async getAll(): Promise<AuctionData> {
    const rows = await auctionStore.readAll()
    // AuctionData 是 Record，以单行数组存储
    if (rows.length > 0 && rows[0] !== null) return rows[0]
    return {}
  },
  async save(data: AuctionData): Promise<void> {
    await auctionStore.writeAll([data])
  },
}
