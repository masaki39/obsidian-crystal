import { spawn } from "child_process";
import { App } from 'obsidian';

export class TerminalService {
    private vaultPath: string;

    constructor(app?: App) {
        this.vaultPath = app ? ((app.vault.adapter as any).basePath || '') : '';
    }
    async executeCommand(command: string, workingDirectory?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        return new Promise((resolve, reject) => {
            // ログインシェル(-l)を使用してコマンドを実行
            // 標準入力を無視してCLIツールの標準入力待ちを防ぐ
            const child = spawn('zsh', ['-l', '-c', command], {
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
                    exitCode: code || 0
                });
            });
            child.on('error', (error) => {
                console.error('Terminal command execution error:', error);
                reject(error);
            });
        });
    }
}