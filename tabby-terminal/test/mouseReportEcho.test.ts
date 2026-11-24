import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MouseReportEchoDetector } from '../src/frontends/mouseReportEcho.ts'

describe('MouseReportEchoDetector', () => {
    it('detects a shell echoing SGR mouse reports as text (#11397)', () => {
        const d = new MouseReportEchoDetector()
        d.noteInput('\x1b[<35;24;39M', 0)
        d.noteInput('\x1b[<35;24;40M', 5)
        assert.equal(d.isEchoed('35;24;39M', 10), true)
    })

    it('detects caret-notation echo and echo glued to previous reports', () => {
        const d = new MouseReportEchoDetector()
        d.noteInput('\x1b[<0;90;14M\x1b[<0;90;14m', 0)
        assert.equal(d.isEchoed('^[[<0;90;14M', 1), true)
        const e = new MouseReportEchoDetector()
        e.noteInput('\x1b[<51;70;20M', 0)
        assert.equal(e.isEchoed('51;70;19M51;70;20M', 1), true)
    })

    it('detects echo split across output chunks', () => {
        const d = new MouseReportEchoDetector()
        d.noteInput('\x1b[<35;100;8M', 0)
        assert.equal(d.isEchoed('prompt$ 35;10', 1), false)
        assert.equal(d.isEchoed('0;8M', 2), true)
    })

    it('ignores output from apps that consume mouse reports', () => {
        const d = new MouseReportEchoDetector()
        d.noteInput('\x1b[<0;10;5M\x1b[<0;10;5m', 0)
        assert.equal(d.isEchoed('\x1b[5;10H\x1b[7mselected\x1b[0m', 3), false)
        assert.equal(d.isEchoed('\x1b[<0;10;5M', 4), false)
    })

    it('does not match inside longer numbers', () => {
        const d = new MouseReportEchoDetector()
        d.noteInput('\x1b[<0;10;5M', 0)
        assert.equal(d.isEchoed('100;10;5M', 1), false)
        assert.equal(d.isEchoed('2;0;10;5M', 2), false)
    })

    it('forgets reports outside the time window', () => {
        const d = new MouseReportEchoDetector(1000)
        d.noteInput('\x1b[<0;10;5M', 0)
        assert.equal(d.isEchoed('0;10;5M', 5000), false)
    })

    it('ignores ordinary keyboard input', () => {
        const d = new MouseReportEchoDetector()
        d.noteInput('ls -la\r', 0)
        d.noteInput('\x1b[A', 1)
        assert.equal(d.isEchoed('ls -la', 2), false)
    })

    it('handles urxvt 1015 encoding and resets', () => {
        const d = new MouseReportEchoDetector()
        d.noteInput('\x1b[32;10;5M', 0)
        assert.equal(d.isEchoed('32;10;5M', 1), true)
        d.reset()
        assert.equal(d.isEchoed('32;10;5M', 2), false)
    })
})
