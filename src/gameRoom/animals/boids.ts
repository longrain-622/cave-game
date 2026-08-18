import { isSocial, Animal } from './animalIds.js';
import { chunk } from '../world.js';

const boidRange: number = 2 * chunk.width * 64; // 邻居有效范围
const separationRange: number = 2 * 64; // 分离判定距离

// 综合方向中三条规则的权重
const cohesionWeight: number = 1;
const alignmentWeight: number = 1;
const separationWeight: number = 1.5;

// 避免循环依赖
let animalList: Animal[] = [];

interface Vec2 {
    x: number;
    y: number;
}

// 单次扫描算出的群聚数据
interface FlockInfo {
    count: number; // 邻居数量
    avgDir: number; // 邻居平均方向
    centerX: number; // 群体中心 x
    centerY: number; // 群体中心 y
    steerX: number; // 推离方向的水平分量
    steerY: number; // 推离方向的竖直分量
}

// 对齐 分离 聚集 三项数据
function gatherFlock(animal: Animal, range: number = boidRange): FlockInfo {
    const rangeSq: number = range * range;
    const sepRangeSq: number = separationRange * separationRange;
    let count: number = 0;
    let dirSum: number = 0;
    let sumX: number = animal.x; // 包含自己
    let sumY: number = animal.y;
    let steerX: number = 0;
    let steerY: number = 0;

    for (const other of animalList) {
        if (other === animal || other.isDying || other.type !== animal.type) { continue; }
        const dx: number = other.x - animal.x;
        const dy: number = other.y - animal.y;
        const distSq: number = dx * dx + dy * dy;
        if (distSq > rangeSq) { continue; }

        count++;
        dirSum += other.dir;
        sumX += other.x;
        sumY += other.y;

        if (distSq < sepRangeSq && distSq > 0) { // 靠得太近产生推离力，越近推力越大
            const dist: number = Math.sqrt(distSq);
            const push: number = 1 - dist / separationRange;
            steerX += ((animal.x - other.x) / dist) * push;
            steerY += ((animal.y - other.y) / dist) * push;
        }
    }

    return {
        count,
        avgDir: count === 0 ? 0 : dirSum / count,
        centerX: sumX / (count + 1),
        centerY: sumY / (count + 1),
        steerX,
        steerY,
    };
}

// 注入动物列表
function setAnimalList(list: Animal[]): void {
    animalList = list;
}

// 有效范围内的同类邻居
function getNeighbors(animal: Animal, range: number = boidRange): Animal[] {
    const neighbors: Animal[] = [];
    const rangeSq: number = range * range;

    for (const other of animalList) {
        if (other === animal || other.isDying || other.type !== animal.type) { continue; }
        const dx: number = other.x - animal.x;
        const dy: number = other.y - animal.y;
        if (dx * dx + dy * dy <= rangeSq) {
            neighbors.push(other);
        }
    }
    return neighbors;
}

// 对齐：返回邻居的平均方向，没有邻居时维持原方向
function averageDirection(animal: Animal): number {
    const info: FlockInfo = gatherFlock(animal);
    if (info.count === 0) { return animal.dir; }
    return info.avgDir;
}

// 分离：检测是否距离同类太近
function isTooClose(animal: Animal): boolean {
    return gatherFlock(animal, separationRange).count > 0;
}

// 分离：返回远离太近同类的方向向量，没有太近同类时返回零向量
function separationSteer(animal: Animal): Vec2 {
    const info: FlockInfo = gatherFlock(animal);
    return { x: info.steerX, y: info.steerY };
}

// 聚集：返回群体中心位置，没有邻居时返回自己
function groupCenter(animal: Animal): Vec2 {
    const info: FlockInfo = gatherFlock(animal);
    return { x: info.centerX, y: info.centerY };
}

// 综合三条规则返回期望的水平移动方向
function flockDirection(animal: Animal): number {
    if (!isSocial(animal.type)) { return 0; } // 非群居动物不参与 flock
    const info: FlockInfo = gatherFlock(animal);
    if (info.count === 0) { return 0; }

    const cohesionDir: number = info.centerX > animal.x ? 1 : info.centerX < animal.x ? -1 : 0;
    const steer: number =
        cohesionWeight * cohesionDir +
        alignmentWeight * info.avgDir +
        separationWeight * info.steerX;

    return steer > 0 ? 1 : steer < 0 ? -1 : 0;
}

export { boidRange, separationRange, setAnimalList, getNeighbors, averageDirection, isTooClose, separationSteer, groupCenter, flockDirection };
