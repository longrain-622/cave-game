// bmFunction.test.ts
// 方块机制函数（草/泥土延迟变化、沙子重力、仙人掌/枯灌木、门、雪草）的单元测试
// 运行：npm test（vitest）
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { idOfBlock } from '../src/gameRoom/nature/blockMecha/blocks.js';
import { world, loadWorld, setWorldState, newBlockState } from '../src/gameRoom/world.js';
import { lowest_point } from '../src/gameRoom/nature/createWorld.js';
import { entityBlock_array } from '../src/gameRoom/nature/entityBlock.js';
import { particleArray } from '../src/gameRoom/particle.js';
import { dropArray } from '../src/gameRoom/dropped/droppedItem.js';
import { mouse } from '../src/gameRoom/mouse.js';
import {
    setGrassDirt,
    grass_and_dirt,
    inviconGrass,
    sand_gravity,
    cactus_and_deadBush,
    door,
    door_openOrClose,
    snowGrass,
} from '../src/gameRoom/nature/blockMecha/bmFunction.js';

// 依赖链中与浏览器强耦合的模块（PIXI 渲染、玩家、鼠标、背包、音频）在此 mock，
// 其余模块（world/blocks/entityBlock/particle/droppedItem 等）使用真实实现
vi.mock('../src/gameRoom/rendering.js', () => ({
    app: { view: { style: {} }, stage: { sortableChildren: true, addChild: () => {} } },
    blockTextures: {},
    gameRoom: null,
}));
vi.mock('../src/gameRoom/player.js', () => ({
    player: {
        x: 0, y: 0, width: 32, height: 32, face: 1, screen_x: 0, screen_y: 0, hp: 20,
        initXY: () => {}, // createWorld 模块级调用
        initPlayer: () => {},
    },
}));
// pixi.js 本体可在 Node 下使用（Container 等是纯 JS），只替换会发起真实资源加载的 Assets
vi.mock('pixi.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('pixi.js')>();
    return { ...actual, Assets: { load: async () => ({}) } };
});
vi.mock('../src/gameRoom/mouse.js', () => ({
    mouse: { world_x: 0, world_y: 0, x: 0, y: 0 },
}));
vi.mock('../src/gameRoom/gui/gameGUI/inventory.js', () => ({
    inventory: { items: [] },
    widgets: { select: 0 },
    pickupObj: null,
}));
vi.mock('../src/gameRoom/others/audioManager.js', () => ({}));

const WORLD_WIDTH: number = 16;
const WORLD_HEIGHT: number = 256; // isOutOfBounds 依赖 world_height，测试世界必须正好 256 行
const GRASS_DELAY_FRAMES: number = 256;

// 新建一片全空气世界并替换当前 world
function newWorld(): void {
    loadWorld(Array.from({ length: WORLD_HEIGHT }, (): number[] => new Array(WORLD_WIDTH).fill(idOfBlock.air)));
}

// 连续运行 frames 帧 setGrassDirt（草/泥土延迟变化）
function runFrames(frames: number): void {
    for (let i = 0; i < frames; i++) {
        setGrassDirt();
    }
}

beforeEach(() => {
    newWorld();
});

describe('草/泥土延迟变化', () => {
    it('被覆盖的草延迟 256 帧后变成泥土', () => {
        setWorldState({ x: 5, y: 5 }, newBlockState(idOfBlock.grass));
        setWorldState({ x: 5, y: 4 }, newBlockState(idOfBlock.stone)); // 上方被石头盖住

        expect(grass_and_dirt(idOfBlock.grass, 5, 5)).toBe(idOfBlock.grass); // 原样返回传入方块
        runFrames(100);
        expect(world[5][5]).toBe(idOfBlock.grass); // 延迟未到期
        runFrames(GRASS_DELAY_FRAMES);
        expect(world[5][5]).toBe(idOfBlock.dirt); // 延迟到期，草变成泥土
    });

    it('上方无遮挡的草不进入延迟，始终不变', () => {
        setWorldState({ x: 9, y: 5 }, newBlockState(idOfBlock.grass)); // 上方是空气
        grass_and_dirt(idOfBlock.grass, 9, 5);
        runFrames(GRASS_DELAY_FRAMES + 100);
        expect(world[5][9]).toBe(idOfBlock.grass); // world[y][x]
    });

    it('延迟期间遮挡被移走，到期后重新验证条件，草保持不变', () => {
        setWorldState({ x: 5, y: 5 }, newBlockState(idOfBlock.grass));
        setWorldState({ x: 5, y: 4 }, newBlockState(idOfBlock.stone));
        grass_and_dirt(idOfBlock.grass, 5, 5); // 满足条件，开始延迟
        setWorldState({ x: 5, y: 4 }, newBlockState(idOfBlock.air)); // 延迟期间盖子被移走
        runFrames(GRASS_DELAY_FRAMES + 100);
        expect(world[5][5]).toBe(idOfBlock.grass);
    });

    it('旁边有草且上方是空气的泥土，延迟后长草', () => {
        setWorldState({ x: 5, y: 5 }, newBlockState(idOfBlock.dirt));
        setWorldState({ x: 6, y: 5 }, newBlockState(idOfBlock.grass)); // 旁边是草
        grass_and_dirt(idOfBlock.dirt, 5, 5);
        runFrames(GRASS_DELAY_FRAMES + 100);
        expect(world[5][5]).toBe(idOfBlock.grass);
    });

    it('旁边没有草的泥土，延迟后不变', () => {
        setWorldState({ x: 7, y: 5 }, newBlockState(idOfBlock.dirt));
        grass_and_dirt(idOfBlock.dirt, 7, 5);
        runFrames(GRASS_DELAY_FRAMES + 100);
        expect(world[5][7]).toBe(idOfBlock.dirt); // world[y][x]
    });
});

describe('虚草 inviconGrass', () => {
    it('下方是草/泥土时保留，否则消失并生成粒子', () => {
        setWorldState({ x: 5, y: 5 }, newBlockState(idOfBlock.invicon_grass));
        setWorldState({ x: 5, y: 6 }, newBlockState(idOfBlock.grass));
        expect(inviconGrass(idOfBlock.invicon_grass, 5, 5)).toBe(idOfBlock.invicon_grass); // 下方是草，保留

        const particleCount: number = particleArray.length;
        setWorldState({ x: 7, y: 5 }, newBlockState(idOfBlock.invicon_grass));
        setWorldState({ x: 7, y: 6 }, newBlockState(idOfBlock.stone));
        expect(inviconGrass(idOfBlock.invicon_grass, 7, 5)).toBe(idOfBlock.air); // 下方非草/泥土，消失
        expect(particleArray.length).toBeGreaterThan(particleCount); // 消失时生成粒子
    });

    it('非虚草方块原样返回', () => {
        expect(inviconGrass(idOfBlock.grass, 5, 5)).toBe(idOfBlock.grass);
    });
});

describe('沙子重力 sand_gravity', () => {
    it('下方悬空且高于地形最低点时转为实体方块', () => {
        const y: number = lowest_point + 1; // 必须高于地形最低点（createWorld 模块级生成地形时确定）
        setWorldState({ x: 3, y: y }, newBlockState(idOfBlock.sand)); // 下方是空气
        const entityCount: number = entityBlock_array.length;

        expect(sand_gravity(idOfBlock.sand, 3, y)).toBe(idOfBlock.stone_dark);
        expect(entityBlock_array.length).toBe(entityCount + 1); // 生成一个沙子实体
        expect(entityBlock_array[entityCount].world_x).toBe(3);
        expect(entityBlock_array[entityCount].world_y).toBe(y);
    });

    it('下方有支撑时保持，不高于最低点时转为空气', () => {
        setWorldState({ x: 4, y: 5 }, newBlockState(idOfBlock.sand));
        setWorldState({ x: 4, y: 6 }, newBlockState(idOfBlock.stone));
        expect(sand_gravity(idOfBlock.sand, 4, 5)).toBe(idOfBlock.sand); // 下方有支撑

        setWorldState({ x: 5, y: 0 }, newBlockState(idOfBlock.sand)); // y=0 不高于最低点 lowest_point=0
        expect(sand_gravity(idOfBlock.sand, 5, 0)).toBe(idOfBlock.air);
    });

    it('非沙子方块原样返回', () => {
        expect(sand_gravity(idOfBlock.dirt, 4, 5)).toBe(idOfBlock.dirt);
    });
});

describe('仙人掌/枯灌木 cactus_and_deadBush', () => {
    it('仙人掌下方无支撑时消失并掉落，下方是仙人掌时保持', () => {
        setWorldState({ x: 5, y: 5 }, newBlockState(idOfBlock.cactus));
        setWorldState({ x: 5, y: 6 }, newBlockState(idOfBlock.stone));
        const dropCount: number = dropArray.length;

        expect(cactus_and_deadBush(idOfBlock.cactus, 5, 5)).toBe(idOfBlock.air); // 消失
        expect(dropArray.length).toBeGreaterThan(dropCount); // 产生掉落物

        setWorldState({ x: 6, y: 5 }, newBlockState(idOfBlock.cactus));
        setWorldState({ x: 6, y: 6 }, newBlockState(idOfBlock.cactus));
        expect(cactus_and_deadBush(idOfBlock.cactus, 6, 5)).toBe(idOfBlock.cactus); // 下方是仙人掌，保持
    });

    it('枯灌木下方悬空时消失，有支撑时保持', () => {
        setWorldState({ x: 7, y: 5 }, newBlockState(idOfBlock.deadBush));
        expect(cactus_and_deadBush(idOfBlock.deadBush, 7, 5)).toBe(idOfBlock.air); // 悬空，消失

        setWorldState({ x: 8, y: 5 }, newBlockState(idOfBlock.deadBush));
        setWorldState({ x: 8, y: 6 }, newBlockState(idOfBlock.stone));
        expect(cactus_and_deadBush(idOfBlock.deadBush, 8, 5)).toBe(idOfBlock.deadBush); // 有支撑，保持
    });

    it('其他方块原样返回', () => {
        expect(cactus_and_deadBush(idOfBlock.stone, 8, 5)).toBe(idOfBlock.stone);
    });
});

describe('门 door', () => {
    it('上下两截成对存在时保持，缺一截就消失', () => {
        setWorldState({ x: 5, y: 5 }, newBlockState(idOfBlock.oak_door_bottom));
        setWorldState({ x: 5, y: 4 }, newBlockState(idOfBlock.oak_door_top));
        expect(door(idOfBlock.oak_door_bottom, 5, 5)).toBe(idOfBlock.oak_door_bottom); // 下门上方是上门
        expect(door(idOfBlock.oak_door_top, 5, 4)).toBe(idOfBlock.oak_door_top); // 上门下方是下门

        setWorldState({ x: 6, y: 5 }, newBlockState(idOfBlock.oak_door_bottom));
        expect(door(idOfBlock.oak_door_bottom, 6, 5)).toBe(idOfBlock.air); // 上半截缺失

        setWorldState({ x: 7, y: 4 }, newBlockState(idOfBlock.oak_door_top));
        expect(door(idOfBlock.oak_door_top, 7, 4)).toBe(idOfBlock.air); // 下半截缺失
    });

    it('开启状态的门同样需要成对', () => {
        setWorldState({ x: 8, y: 5 }, newBlockState(idOfBlock.oak_door_bottom_open));
        setWorldState({ x: 8, y: 4 }, newBlockState(idOfBlock.oak_door_top_open));
        expect(door(idOfBlock.oak_door_bottom_open, 8, 5)).toBe(idOfBlock.oak_door_bottom_open);
        expect(door(idOfBlock.oak_door_top_open, 8, 4)).toBe(idOfBlock.oak_door_top_open);

        setWorldState({ x: 9, y: 5 }, newBlockState(idOfBlock.oak_door_bottom_open));
        expect(door(idOfBlock.oak_door_bottom_open, 9, 5)).toBe(idOfBlock.air); // 上半截缺失
    });

    it('世界边缘越界保护，非门方块原样返回', () => {
        setWorldState({ x: 0, y: 0 }, newBlockState(idOfBlock.oak_door_top));
        expect(door(idOfBlock.oak_door_top, 0, 0)).toBe(idOfBlock.oak_door_top); // y=0 越界保护

        expect(door(idOfBlock.stone, 5, 5)).toBe(idOfBlock.stone);
    });
});

describe('门开关 door_openOrClose', () => {
    it('点击门时上下两截同步开关', () => {
        setWorldState({ x: 5, y: 5 }, newBlockState(idOfBlock.oak_door_bottom));
        setWorldState({ x: 5, y: 4 }, newBlockState(idOfBlock.oak_door_top));
        mouse.world_x = 5;
        mouse.world_y = 5;
        door_openOrClose();
        expect(world[5][5]).toBe(idOfBlock.oak_door_bottom_open); // 开门
        expect(world[4][5]).toBe(idOfBlock.oak_door_top_open); // 上门同步开启

        door_openOrClose(); // 再点一次，关门
        expect(world[5][5]).toBe(idOfBlock.oak_door_bottom);
        expect(world[4][5]).toBe(idOfBlock.oak_door_top);

        mouse.world_y = 4; // 对准上门
        door_openOrClose();
        expect(world[5][5]).toBe(idOfBlock.oak_door_bottom_open); // 点击上门也能开门
    });

    it('点击非门方块无变化', () => {
        setWorldState({ x: 6, y: 5 }, newBlockState(idOfBlock.stone));
        mouse.world_x = 6;
        mouse.world_y = 5;
        door_openOrClose();
        expect(world[5][6]).toBe(idOfBlock.stone); // world[y][x]
    });
});

describe('雪草 snowGrass', () => {
    it('上方被遮挡时变成泥土，否则保持', () => {
        setWorldState({ x: 5, y: 5 }, newBlockState(idOfBlock.snowGrass)); // 上方是空气
        expect(snowGrass(idOfBlock.snowGrass, 5, 5)).toBe(idOfBlock.snowGrass);

        setWorldState({ x: 6, y: 5 }, newBlockState(idOfBlock.snowGrass));
        setWorldState({ x: 6, y: 4 }, newBlockState(idOfBlock.stone));
        expect(snowGrass(idOfBlock.snowGrass, 6, 5)).toBe(idOfBlock.dirt); // 被遮挡，变泥土
    });

    it('非雪草方块原样返回', () => {
        expect(snowGrass(idOfBlock.grass, 6, 5)).toBe(idOfBlock.grass);
    });
});
