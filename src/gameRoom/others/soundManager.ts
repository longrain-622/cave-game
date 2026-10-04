import { apiObjects } from "../../apiox/dom.js";
import { apioxTime } from "../../apiox/time.js";

interface SoundMessage {
    name: string;
    url: string;
}

class SoundManager {
    private audioContext: AudioContext;
    private sounds: Map<string, AudioBuffer> = new Map();
    private loadingPromises: Map<string, Promise<void>> = new Map();
    private initPromise: Promise<void>; // 整体初始化完成的 Promise
    private exclusivePlaying: Set<string> = new Set(); // 记录正在独占播放的音效
    private isReady: boolean = false;

    constructor() {
        this.audioContext = new (apiObjects.win.AudioContext || (apiObjects.win as any).webkitAudioContext)();
        this.initPromise = this.init();
    }

    // BGM 相关
    private bgmList: string[] = ['wethands', 'dryhands', 'danny', 'clark', 'haggstrom', 'livingmice', 'miceonvenus', 'subwoofer', 'sweden']; // 音效名称
    private currentBgmSource: AudioBufferSourceNode | null = null;
    private currentBgmGain: GainNode | null = null;
    private bgmTimer: number | null = null;
    private isBgmPlaying: boolean = false;

    // 自动加载所有游戏音效
    private async init(): Promise<void> {
        const soundList: SoundMessage[] = [
            { name: 'wethands', url: 'assets/sounds/bgm/wethands.mp3' },
            { name: 'dryhands', url: 'assets/sounds/bgm/dryhands.mp3' },
            { name: 'danny', url: 'assets/sounds/bgm/danny.mp3' },
            { name: 'clark', url: 'assets/sounds/bgm/clark.mp3' },
            { name: 'haggstrom', url: 'assets/sounds/bgm/haggstrom.mp3' },
            { name: 'livingmice', url: 'assets/sounds/bgm/livingmice.mp3' },
            { name: 'miceonvenus', url: 'assets/sounds/bgm/miceonvenus.mp3' },
            { name: 'subwoofer', url: 'assets/sounds/bgm/subwoofer.mp3' },
            { name: 'sweden', url: 'assets/sounds/bgm/sweden.mp3' },
            { name: 'pop', url: 'assets/sounds/player/pop.ogg' },
            { name: 'gravel1', url: 'assets/sounds/dig/gravel1.ogg' },
            { name: 'gravel2', url: 'assets/sounds/dig/gravel2.ogg' },
            { name: 'gravel3', url: 'assets/sounds/dig/gravel3.ogg' },
            { name: 'gravel4', url: 'assets/sounds/dig/gravel4.ogg' },
            { name: 'stone4', url: 'assets/sounds/dig/stone4.ogg' },
            { name: 'leavebreak', url: 'assets/sounds/dig/leavebreak.ogg' },
            { name: 'woodbreak1', url: 'assets/sounds/dig/woodbreak1.ogg' },
            { name: 'woodbreak2', url: 'assets/sounds/dig/woodbreak2.ogg' },
            { name: 'woodbreak3', url: 'assets/sounds/dig/woodbreak3.ogg' },
            { name: 'playerhurt1', url: 'assets/sounds/player/Player_hurt1.ogg' },
            { name: 'playerhurt2', url: 'assets/sounds/player/Player_hurt2.ogg' },
            { name: 'playerhurt3', url: 'assets/sounds/player/Player_hurt3.ogg' },
            { name: 'strong1', url: 'assets/sounds/attack/strong1.ogg' },
            { name: 'strong2', url: 'assets/sounds/attack/strong2.ogg' },
            { name: 'cactus_break', url: 'assets/sounds/dig/cactus_break.ogg' },
            { name: 'grassDig1', url: 'assets/sounds/dig/Grass_dig1.ogg' },
            { name: 'grassDig2', url: 'assets/sounds/dig/Grass_dig2.ogg' },
            { name: 'glassBreak1', url: 'assets/sounds/dig/glassBreak1.ogg' },
            { name: 'glassBreak2', url: 'assets/sounds/dig/glassBreak2.ogg' },
            { name: 'glassBreak3', url: 'assets/sounds/dig/glassBreak3.ogg' },
            { name: 'waterSplash', url: 'assets/sounds/water/Water_splash1.ogg' },
            { name: 'bucketEmpty', url: 'assets/sounds/water/Bucket_empty1.ogg' },
            { name: 'bucketFill', url: 'assets/sounds/water/Bucket_fill1.ogg' },
            { name: 'swim1', url: 'assets/sounds/water/Swim5.ogg' },
            { name: 'swim2', url: 'assets/sounds/water/Swim6.ogg' },
            { name: 'swim3', url: 'assets/sounds/water/Swim7.ogg' },
            // 此处继续添加其他音效
        ];
        await Promise.all(soundList.map(s => this.loadSound(s.name, s.url)));
        this.isReady = true;
        console.log('all sounds were loaded');
    }

    // 开始背景音乐循环（需要在用户交互后调用）
    async startBGM(initialVolume: number = 0.3): Promise<void> {
        if (this.isBgmPlaying) {return;}
        this.isBgmPlaying = true;
        await this.playRandomBGM(initialVolume);
    }

    // 停止背景音乐（并清除定时器）
    stopBGM(): void {
        if (this.bgmTimer) {
            apioxTime.clearOut(this.bgmTimer);
            this.bgmTimer = null;
        }
        if (this.currentBgmSource) {
            this.currentBgmSource.stop();
            this.currentBgmSource.disconnect();
            this.currentBgmSource = null;
        }
        if (this.currentBgmGain) {
            this.currentBgmGain.disconnect();
            this.currentBgmGain = null;
        }
        this.isBgmPlaying = false;
    }

    // 内部方法：随机播放一首 BGM，并安排下一首
    private async playRandomBGM(volume: number): Promise<void> {
        if (!this.isBgmPlaying) {return;}

        const randomIndex = Math.floor(Math.random() * this.bgmList.length);
        const bgmName = this.bgmList[randomIndex];

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const buffer = this.sounds.get(bgmName);
        if (!buffer) {
            console.error(`BGM ${bgmName} cannot load`);
            this.scheduleNextBGM(volume);
            return;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = false;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        this.currentBgmSource = source;
        this.currentBgmGain = gainNode;

        source.onended = () => {
            this.scheduleNextBGM(volume);
        };

        source.start();
    }

    // 安排下一首 BGM
    private scheduleNextBGM(volume: number): void {
        if (this.bgmTimer) {apioxTime.clearOut(this.bgmTimer);}
        this.bgmTimer = apioxTime.setOut(() => {
            this.bgmTimer = null;
            this.playRandomBGM(volume).catch(e => console.error('cannot play sound:', e));
        }, 600000);
    }

    // 调整 BGM 音量
    setBGMVolume(volume: number): void {
        if (this.currentBgmGain) {
            this.currentBgmGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    // 加载单个音效（内部使用，自动去重）
    private async loadSound(name: string, url: string): Promise<void> {
        if (this.sounds.has(name)) {return;}
        if (this.loadingPromises.has(name)) {return this.loadingPromises.get(name)!;}

        const promise = (async () => {
            const response = await fetch(url);
            if (!response.ok) {throw new Error(`HTTP ${response.status}`);}
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds.set(name, audioBuffer);
        })();

        this.loadingPromises.set(name, promise);
        await promise;
        this.loadingPromises.delete(name);
    }

    // 播放音效（自动等待初始化完成）
    async play(name: string, volume: number = 1): Promise<void> {
        if (!this.isReady) {
            await this.initPromise;
        }

        const buffer = this.sounds.get(name);
        if (!buffer) {
            console.warn(`sound ${name} cannot load`);
            return;
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.onended = () => {
            source.disconnect();
            gainNode.disconnect();
        };

        source.start();
    }

    // group 相同的音效互相独占；不传 group 时默认用 name 作为 group
    async playOnce(name: string, volume: number = 1, group?: string): Promise<void> {
        if (!this.isReady) {
            await this.initPromise;
        }

        const buffer = this.sounds.get(name);
        if (!buffer) {
            console.warn(`sound ${name} cannot load`);
            return;
        }

        const key = group ?? name;

        if (this.exclusivePlaying.has(key)) {
            return;
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        this.exclusivePlaying.add(key);

        source.onended = () => {
            this.exclusivePlaying.delete(key);
            source.disconnect();
            gainNode.disconnect();
        };

        source.start();
    }

    // 提前恢复音频上下文
    async resumeContext(): Promise<void> {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
}

export const soundManager = new SoundManager();