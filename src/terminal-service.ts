import { spawn } from "child_process";

export class TerminalService {
    async executeCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        return new Promise((resolve, reject) => {
            // ログインシェル(-l)を使用してコマンドを実行
            const child = spawn('zsh', ['-l', '-c', command], {
                stdio: ['pipe', 'pipe', 'pipe']
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
                console.log(stdout);
                console.log(stderr);
                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    exitCode: code || 0
                });
            });
            child.on('error', (error) => {
                reject(error);
            });
        });
    }
}