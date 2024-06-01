import { TESTING, RESULT_HANDLER } from './config'
import { CommandExecutor, CommandQueue, CommandSequenceProvider} from "./commands";
import { type StateResult} from "./types";
import { colorTrace } from "./utility";


export class ProcessManager {
    private readonly state: ProcessState
    private commandExecutor: CommandExecutor

    constructor() {
        this.state = new ProcessState()
        this.commandExecutor = new CommandExecutor(this.state)
    }

    async init() {
        if (TESTING) RESULT_HANDLER?.setStartTime()
        this.state.setStartingTime()
        this.state.addCommandSequence()
        while (this.state.commandQueue.hasNext()) {
            await this.commandExecutor.executeCommands()
        }
    }
}


export class ProcessState {
    bannersInProgress: number
    result: StateResult
    addedCommands: boolean
    commandQueue: CommandQueue
    clickedElements: Array<HTMLElement>
    startedAt: number

    constructor() {
        this.bannersInProgress = -1
        this.result = []
        this.addedCommands = false
        this.commandQueue = new CommandQueue()
        this.clickedElements = []
        this.startedAt = -1
    }

    public removeResultAtIndex(index: number) {
        this.result.splice(index, 1)
    }

    addCommandSequence(sameRoot = false, settings = false, initialResult: StateResult = []) {
        const sequence = CommandSequenceProvider.get(this, sameRoot, settings)
        this.commandQueue.addCommand(sequence, initialResult)
    }

    setStartingTime() {
        this.startedAt = performance.now()
    }

    printTime() {
        const time = (performance.now() - this.startedAt).toFixed(1)
        colorTrace(`Cookie Banner processed in ${time}ms`, 'lightgreen')
    }

    setBannerInProgress(bannersInProgress: number) {
        this.bannersInProgress = this.bannersInProgress === -1 ? bannersInProgress : this.bannersInProgress
    }
}

