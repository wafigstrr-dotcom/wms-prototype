/**
 * MSW handler 聚合入口
 * 将所有模块的 handler 汇总为一个数组，供 browser.ts 注册
 */
import { authHandlers } from './auth.mock'
import { usersHandlers } from './users.mock'
import { inventoryHandlers } from './inventory.mock'
import { flowsHandlers } from './flows.mock'
import { warehousesHandlers } from './warehouses.mock'
import { locationsHandlers } from './locations.mock'
import { inboundHandlers } from './inbound.mock'
import { queryHandlers } from './query.mock'
import { outboundHandlers } from './outbound.mock'
import { auctionHandlers } from './auction.mock'

export const handlers = [
  ...authHandlers,
  ...usersHandlers,
  ...inventoryHandlers,
  ...flowsHandlers,
  ...warehousesHandlers,
  ...locationsHandlers,
  ...inboundHandlers,
  ...queryHandlers,
  ...outboundHandlers,
  ...auctionHandlers,
]
