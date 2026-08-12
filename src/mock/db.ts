/**
 * Mock 数据持久化层
 * 基于 LocalForage（IndexedDB）实现浏览器端异步存储
 * 每个 Db 类对应一个 localforage 实例，数据以 JSON 数组形式存储在单个 key 下
 */
import localforage from 'localforage'
import type { User, InventoryItem, Flow, Warehouse, Location, DirectMaterial, DirectMaterialSubItem } from '../types'

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

// 业务数据集种子版本：每次递增会在启动时一次性重建业务集合
// V2：清空全部虚拟业务数据，仅保留 users / warehouses / locations 配置
// V3：播种 20 条直接物料主记录 + 随机子项（1~6 个/条）
// V3.1：所有直接物料都必须有 PO 号（修复原逻辑的 75% 概率缺失问题）
const SEED_VERSION = 3.1
const BUSINESS_STORES = ['directMaterials', 'directMaterialSubItems', 'inventory', 'flows', 'auction']

// ==================== 业务种子生成（V3，固定种子可复现） ====================
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildSeedDirectMaterials(): { materials: DirectMaterial[], subItems: DirectMaterialSubItem[] } {
  const rand = mulberry32(20260811)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  const pad = (n: number) => String(n).padStart(2, '0')
  const materials: DirectMaterial[] = []
  const subItems: DirectMaterialSubItem[] = []
  const pbus = ['AS', 'CS', 'IR', 'BMS', 'SS']
  const departments = ['EE', '零部件测试', '样机试制']
  const applicants = ['朱智国', '孔留网', '刘京广']
  const purchaseEngineers = ['范广武', '乔黎明']
  const suppliers = [
    { code: 'S0012', name: '上海精密机械有限公司' },
    { code: 'S0034', name: '苏州电子科技有限公司' },
    { code: 'S0056', name: '无锡金属制品有限公司' },
    { code: 'S0078', name: '南京自动化设备厂' },
    { code: 'S0091', name: '杭州仪器仪表有限公司' },
  ]
  const materialNames = ['压缩机测试样件', '控制箱线束', '室外机钣金件', '电磁阀组件', '传感器支架', '风机电机总成', '换热器铜管', '电控板组件', '阀体铸件', '减震垫组', '接线端子排', '温控器模块']
  const subNames = ['主体件', '紧固螺钉组', '密封垫片', '线束组件', '安装支架', '防护外壳', '接线端子', '减震垫']
  let subId = 4001
  for (let i = 0; i < 20; i++) {
    const id = 201 + i
    const month = 1 + Math.floor(rand() * 6)
    const day = 1 + Math.floor(rand() * 28)
    const orderDate = `2025-${pad(month)}-${pad(day)}`
    const delivery = new Date(`${orderDate}T00:00:00Z`)
    delivery.setUTCDate(delivery.getUTCDate() + 20 + Math.floor(rand() * 20))
    const sapNo = `SAP-${100000 + Math.floor(rand() * 900000)}`
    const qty = 2 + Math.floor(rand() * 30)
    const supplier = pick(suppliers)
    
    // V3.1：所有 20 条直接物料都必须有 PO 号（原逻辑 75% 概率→100% 强制）
    const poNo = `PO2025${pad(month)}${String(1001 + i)}`
    materials.push({
      id,
      orderDate,
      applicant: pick(applicants),
      owner: '',
      pbu: pick(pbus),
      department: pick(departments),
      projectCode: `PRJ-2025-${String(i + 1).padStart(3, '0')}`,
      purchaseEngineer: pick(purchaseEngineers),
      sapDrawingNo: sapNo,
      purchaseDescription: `${pick(materialNames)}-${pad(i + 1)}`,
      prNo: `PR2025${pad(month)}${String(1001 + i)}`,
      item: String(10000100 + i),
      purchaseGroup: pick(['PG01', 'PG02', 'PG03']),
      quantity: qty,
      exempt3C: rand() > 0.7 ? '是' : '否',
      supplierCode: supplier.code,
      supplierName: supplier.name,
      amount: Math.round(qty * (80 + rand() * 2400)),
      poNo, // ← 强制生成 PO 号（V3.1）
      deliveryDate: delivery.toISOString().slice(0, 10),
      sentToSupplier: rand() > 0.3 ? '是' : '否', // ← sentToSupplier 仍为随机
      remark: '',
      createTime: `${orderDate}T08:00:00.000Z`,
    })
    // 随机子项数 1~6
    const subCount = 1 + Math.floor(rand() * 6)
    for (let j = 0; j < subCount; j++) {
      subItems.push({
        id: subId++,
        parentId: id,
        sapDrawingNo: `${sapNo}-${String.fromCharCode(65 + j)}`,
        purchaseDescription: `${pick(subNames)}${j + 1}`,
        quantity: 1 + Math.floor(rand() * 20),
        createTime: `${orderDate}T08:00:00.000Z`,
      })
    }
  }
  // owner 默认同申请人
  for (const m of materials) m.owner = m.applicant
  return { materials, subItems }
}

/** 初始化种子数据（应用启动时调用一次） */
export async function ensureSeed(): Promise<void> {
  // 种子版本升级：重建业务数据集（保留用户与仓库配置）
  const metaStore = createStore<{ seedVersion: number }>('meta')
  const meta = await metaStore.readAll()
  if (meta.length === 0 || meta[0].seedVersion < SEED_VERSION) {
    for (const name of BUSINESS_STORES) {
      const s = createStore<unknown>(name)
      await s.writeAll([])
    }
    // V3：播种 20 条直接物料 + 随机子项（库存/流程保持为空）
    const { materials, subItems } = buildSeedDirectMaterials()
    await createStore<DirectMaterial>('directMaterials').writeAll(materials)
    await createStore<DirectMaterialSubItem>('directMaterialSubItems').writeAll(subItems)
    await metaStore.writeAll([{ seedVersion: SEED_VERSION }])
  }
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
  // 业务集合存在性兼容：空则初始化为空数组（直接物料种子已在版本升级时播种）
  for (const name of BUSINESS_STORES) {
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

// ==================== Direct Materials ====================
const directMaterialsStore = createStore<DirectMaterial>('directMaterials')

export const DirectMaterialDb = {
  async getAll(): Promise<DirectMaterial[]> {
    const items = await directMaterialsStore.readAll()
    return items.filter(m => !m.isDeleted)
  },
  async add(item: Omit<DirectMaterial, 'id' | 'createTime'>): Promise<DirectMaterial> {
    const items = await directMaterialsStore.readAll()
    const now = new Date().toISOString()
    const newItem = { ...item, id: Date.now() + Math.floor(Math.random() * 1000), createTime: now, updatedAt: now, isDeleted: false } as DirectMaterial
    items.push(newItem)
    await directMaterialsStore.writeAll(items)
    return newItem
  },
  async update(id: number, updates: Partial<DirectMaterial>): Promise<DirectMaterial | null> {
    const items = await directMaterialsStore.readAll()
    const idx = items.findIndex(i => i.id === id)
    if (idx === -1) return null
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() }
    await directMaterialsStore.writeAll(items)
    return items[idx]
  },
  // 软删除（级联软删其下所有子项）
  async remove(id: number): Promise<boolean> {
    const items = await directMaterialsStore.readAll()
    const idx = items.findIndex(i => i.id === id)
    if (idx === -1) return false
    items[idx] = { ...items[idx], isDeleted: true, updatedAt: new Date().toISOString() }
    await directMaterialsStore.writeAll(items)
    await DirectMaterialSubItemDb.removeByParent(id)
    return true
  },
}

// ==================== Direct Material Sub Items ====================
const directMaterialSubItemsStore = createStore<DirectMaterialSubItem>('directMaterialSubItems')

export const DirectMaterialSubItemDb = {
  async getByParent(parentId: number): Promise<DirectMaterialSubItem[]> {
    const items = await directMaterialSubItemsStore.readAll()
    return items.filter(s => !s.isDeleted && s.parentId === parentId)
  },
  // 统计每个父记录的子项数量：Map<parentId, count>
  async countByParent(): Promise<Record<number, number>> {
    const items = await directMaterialSubItemsStore.readAll()
    const map: Record<number, number> = {}
    for (const s of items) {
      if (!s.isDeleted) map[s.parentId] = (map[s.parentId] || 0) + 1
    }
    return map
  },
  async add(parentId: number, item: Omit<DirectMaterialSubItem, 'id' | 'parentId' | 'createTime'>): Promise<DirectMaterialSubItem> {
    const items = await directMaterialSubItemsStore.readAll()
    const now = new Date().toISOString()
    const newItem = { ...item, id: Date.now() + Math.floor(Math.random() * 1000), parentId, createTime: now, updatedAt: now, isDeleted: false } as DirectMaterialSubItem
    items.push(newItem)
    await directMaterialSubItemsStore.writeAll(items)
    return newItem
  },
  async update(id: number, updates: Partial<DirectMaterialSubItem>): Promise<DirectMaterialSubItem | null> {
    const items = await directMaterialSubItemsStore.readAll()
    const idx = items.findIndex(s => s.id === id)
    if (idx === -1) return null
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() }
    await directMaterialSubItemsStore.writeAll(items)
    return items[idx]
  },
  // 软删除单条
  async remove(id: number): Promise<boolean> {
    const items = await directMaterialSubItemsStore.readAll()
    const idx = items.findIndex(s => s.id === id)
    if (idx === -1) return false
    items[idx] = { ...items[idx], isDeleted: true, updatedAt: new Date().toISOString() }
    await directMaterialSubItemsStore.writeAll(items)
    return true
  },
  // 级联软删：置父记录下所有子项 isDeleted
  async removeByParent(parentId: number): Promise<number> {
    const items = await directMaterialSubItemsStore.readAll()
    const now = new Date().toISOString()
    let count = 0
    for (let i = 0; i < items.length; i++) {
      if (items[i].parentId === parentId && !items[i].isDeleted) {
        items[i] = { ...items[i], isDeleted: true, updatedAt: now }
        count++
      }
    }
    if (count > 0) await directMaterialSubItemsStore.writeAll(items)
    return count
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
