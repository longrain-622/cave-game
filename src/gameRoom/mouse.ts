// 鼠标数据
export interface Mouse {
    x: number; y: number;
    world_x: number; world_y: number; // 鼠标在数组中的坐标
    can_use: boolean; // 根据与玩家的距离判断能否挖方块等
    can_put: boolean;
    isDown: boolean; timer: number; destory: number; // 检测挖方块用的计时器、方块被挖掘的程度
    downingButton: number; blockhardness: number; // 鼠标接触的方块的硬度
    last_world_x: number; last_world_y: number;
    last_tool: number; last_targetBlock: number;
}

export const mouse: Mouse = {
    x: 0, y: 0,
    world_x: 0, world_y: 0,
    can_use: true,
    can_put: false,
    isDown: false, timer: 0, destory: 0,
    downingButton: 0,
    blockhardness: 0,
    last_world_x: -1, last_world_y: -1,
    last_tool: -1, last_targetBlock: -1,
};
