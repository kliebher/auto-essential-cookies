import { TESTING, RESULT_HANDLER, SESSION_STORAGE} from './config'
import { type Command, CommandExecutor, CommandQueue, CommandSequenceProvider } from "./commands";
import { CookieBannerActionType, type StateResult } from "./types";
import { colorTrace } from "./utility";
import { type AKnownIdentifierMatcher } from './known_identifier'
import * as utility from "./utility";


export class ProcessManager {
    private readonly state: ProcessState
    private commandExecutor: CommandExecutor

    constructor() {
        this.state = new ProcessState()
        this.commandExecutor = new CommandExecutor(this.state)
    }

    async init(arg?: HTMLElement[]) {
        if (TESTING) RESULT_HANDLER?.setStartTime()
        this.state.setExecutionStart()

        const initSequence: Command[] = CommandSequenceProvider.get(this.state, false, false, arg !== undefined)
        this.state.commandQueue.addCommand(initSequence, arg ? arg : [], false, false)

        await new Promise<void>(async (resolve) => {
            while (this.state.commandQueue.hasNext()) {
                await this.commandExecutor.executeCommands()
            }
            resolve()
        })
    }
}


export class ProcessState {
    bannersInProgress: number = -1
    startedAt: number = -1
    addedCommands: boolean = false
    basicSearch: boolean = true
    sameRootSearch: boolean = false
    clickedElements: Array<HTMLElement> = []
    result: StateResult = []
    processedRoots: HTMLElement[] = []
    commandQueue: CommandQueue
    foundKnownMatcher: Map<HTMLElement, AKnownIdentifierMatcher>
    foundKnownAction: Map<HTMLElement, CookieBannerActionType>
    currentSameRoot: HTMLElement | null = null

    constructor() {
        this.commandQueue = new CommandQueue()
        this.foundKnownMatcher = new Map()
        this.foundKnownAction = new Map()
    }

    public removeResultByIndex(index: number) {
        this.result.splice(index, 1)
    }

    addCommandSequence(sameRoot = false, settings = false, initialResult: StateResult = []) {
        const sequence: Command[] = CommandSequenceProvider.get(this, sameRoot, settings)
        this.commandQueue.addCommand(sequence, initialResult, sameRoot, settings)
    }

    setExecutionStart() {
        this.startedAt = performance.now()
    }

    printExecutionTime() {
        const time = (performance.now() - this.startedAt).toFixed(1)
        colorTrace(`Cookie Banner processed in ${time}ms`, 'lightgreen')
    }

    setBannerInProgress(bannersInProgress: number) {
        this.bannersInProgress = this.bannersInProgress === -1 ? bannersInProgress : this.bannersInProgress
    }

    finishProcess(printTime?: boolean, toastMsg?: string) {
        if (toastMsg) utility.createToast(toastMsg)
        // if (printTime) this.printExecutionTime()
        SESSION_STORAGE.set('AEC', 'done')
    }
}

