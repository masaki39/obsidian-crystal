import { ChildProcess, spawn } from "child_process";
import type { App } from 'obsidian';

export class TerminalService {
    private vaultPath: string;

    constructor(app?: App) {
        this.vaultPath = app ? ((app.vault.adapter as any).basePath || '') : '';
    }
    /**
     * 長時間走るプロセス（Marpサーバーなど）を起動し、ChildProcess をそのまま返す。
     * detached: true で独立したプロセスグループを作るため、呼び出し側は
     * process.kill(-pid) でログインシェル配下の子孫プロセスごと停止できる。
     * stdout/stderr は呼び出し側で必ず消費すること（未読のままだとパイプが詰まる）。
     */
    spawnBackgroundCommand(command: string, workingDirectory?: string): ChildProcess {
        const shell = process.env.SHELL || 'zsh';
        return spawn(shell, ['-l', '-c', command], {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: workingDirectory || this.vaultPath || undefined,
            detached: true
        });
    }

    async executeCommand(command: string, workingDirectory?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        return new Promise((resolve, reject) => {
            // ユーザーのログインシェルを使用（未設定時は zsh にフォールバック）
            // ログインシェル(-l)で実行し、標準入力を無視してCLIツールの入力待ちを防ぐ
            const shell = process.env.SHELL || 'zsh';
            const child = spawn(shell, ['-l', '-c', command], {
                stdio: ['ignore', 'pipe', 'pipe'],
                cwd: workingDirectory || this.vaultPath || undefined
            });

            let stdout = '';
            let stderr = '';

            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    // code is null when the process was terminated by a signal;
                    // report a non-zero code so callers don't treat it as success.
                    exitCode: code ?? 1
                });
            });
            child.on('error', (error) => {
                console.error('Terminal command execution error:', error);
                reject(error);
            });
        });
    }
}