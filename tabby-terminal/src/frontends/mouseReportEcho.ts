const MOUSE_REPORT = /\x1b\[<?(\d{1,5};\d{1,5};\d{1,5}[Mm])/g

export const DISABLE_MOUSE_TRACKING = '\x1b[?9l\x1b[?1000l\x1b[?1001l\x1b[?1002l\x1b[?1003l\x1b[?1005l\x1b[?1006l\x1b[?1015l\x1b[?1016l'

function isPlainText (text: string, index: number): boolean {
    if (index > 0 && /[\d;]/.test(text[index - 1])) {
        return false
    }
    const prefix = text.slice(Math.max(0, index - 3), index)
    return !prefix.endsWith('\x1b[<') && !prefix.endsWith('\x1b[')
}

interface SentReport {
    body: string
    at: number
}

export class MouseReportEchoDetector {
    private sent: SentReport[] = []
    private tail = ''

    constructor (
        private windowMs = 2000,
        private maxReports = 64,
    ) { }

    noteInput (data: string, now: number): void {
        if (!data.includes('\x1b[')) {
            return
        }
        for (const match of data.matchAll(MOUSE_REPORT)) {
            this.sent.push({ body: match[1], at: now })
        }
        if (this.sent.length > this.maxReports) {
            this.sent.splice(0, this.sent.length - this.maxReports)
        }
    }

    isEchoed (output: string, now: number): boolean {
        if (!this.sent.length) {
            return false
        }
        while (this.sent.length && now - this.sent[0].at > this.windowMs) {
            this.sent.shift()
        }
        if (!this.sent.length) {
            this.tail = ''
            return false
        }
        const text = this.tail + output
        this.tail = text.slice(-24)
        for (const report of this.sent) {
            let index = text.indexOf(report.body)
            while (index !== -1) {
                if (isPlainText(text, index)) {
                    return true
                }
                index = text.indexOf(report.body, index + 1)
            }
        }
        return false
    }

    reset (): void {
        this.sent = []
        this.tail = ''
    }
}
