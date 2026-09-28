/**
 * Консольный ввод для скриптов scripts/*.
 *
 * Зачем отдельный промптер: в create-user.ts и reset-password-local.ts вопрос
 * «введите пароль» раньше открывал ВТОРОЙ readline поверх первого с
 * `terminal: true`. Второй интерфейс переводит stdin в raw-режим, а после
 * `close()` первый уже не может читать — интерактивный сценарий на Windows
 * зависал намертво. Здесь интерфейс всегда один, а скрытый ввод решается
 * переключателем `muted` на единственном output-потоке: readline сам выводит
 * эхо в этот поток, и при `muted` записи проглатываются, а поток stdin
 * остаётся нетронутым.
 */
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'

/**
 * Поток вывода консоли с переключателем «глушения».
 *
 * `columns` / `rows` / `isTTY` проксируются к настоящему stdout: readline в
 * terminal-режиме читает их для позиционирования курсора, и без них вывод
 * портится escape-последовательностями.
 */
class ConsoleOutput extends Writable {
  muted = false

  constructor(private readonly target: NodeJS.WriteStream) {
    super()
  }

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    const text = chunk.toString()
    if (!this.muted) {
      this.target.write(text)
    } else if (text.includes('\r') || text.includes('\n')) {
      // Ввод съеден, но «Enter» пользователь должен увидеть.
      this.target.write('\n')
    }
    callback()
  }

  get columns(): number | undefined {
    return this.target.columns
  }

  get rows(): number | undefined {
    return this.target.rows
  }

  get isTTY(): boolean | undefined {
    return this.target.isTTY
  }
}

export interface Prompter {
  /** Вопрос с эхом. `def` — значение по умолчанию (пустой ввод его принимает). */
  ask(question: string, def?: string): Promise<string>
  /** Тот же вопрос, но вводимые символы не выводятся (пароль). */
  askHidden(question: string): Promise<string>
  /** Интерактивный режим вообще возможен (есть TTY). */
  readonly interactive: boolean
  close(): void
}

export function createPrompter(): Prompter {
  // terminal берём у TTY: на пайпе/файле raw-режима нет и эха тоже нет.
  const interactive = Boolean(process.stdin.isTTY)
  const output = new ConsoleOutput(process.stdout)
  const rl = createInterface({ input: process.stdin, output, terminal: interactive })

  const ask = async (question: string, def = ''): Promise<string> => {
    const suffix = def ? ` (${def})` : ''
    const answer = (await rl.question(`${question}${suffix}: `)).trim()
    return answer || def
  }

  const askHidden = async (question: string): Promise<string> => {
    // Без TTY эха нет — «глушить» нечего, спрашиваем как обычно.
    if (!interactive) return ask(question)
    // Вопрос печатаем сами: после muted всё, что пишет readline, глотается.
    process.stdout.write(question)
    output.muted = true
    try {
      return (await rl.question('')).trim()
    } finally {
      output.muted = false
    }
  }

  return {
    ask,
    askHidden,
    interactive,
    close: () => rl.close(),
  }
}
