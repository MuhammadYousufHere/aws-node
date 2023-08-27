import * as fs from 'fs';
import path from 'path';
import {parse} from './stackTrace';
import {isString} from '../utils/common-utils';

const filePrefix = 'file://';
function removeFileProtocol(path: string) {
    if (path.startsWith(filePrefix)) {
        return path.slice(filePrefix.length);
    } else {
        return path;
    }
}

function check_path(parent: URL, directory: string) {
    // https://stackoverflow.com/a/45242825/15675011
    const relative = path.relative(parent.pathname, directory);
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
        return relative;
    } else {
        return false;
    }
}

function get_diagnostic() {
    const e = new Error(); // eslint-disable-line unicorn/error-message
    const trace = parse(e);
    if (trace.length >= 4) {
        const invoker_frame = trace[3];
        if (invoker_frame.fileName && invoker_frame.lineNumber) {
            // Just out of an abundance of caution...
            const relative = check_path(global.ce_base_directory, removeFileProtocol(invoker_frame.fileName));
            if (relative) {
                try {
                    const file = fs.readFileSync(invoker_frame.fileName, 'utf8');
                    const lines = file.split('\n');
                    return {
                        file: relative,
                        line: invoker_frame.lineNumber,
                        src: lines[invoker_frame.lineNumber - 1].trim(),
                    };
                } catch (e: any) {}
            }
        }
    }
}

function fail(fail_message: string, user_message: string | undefined, args: any[]): never {
    // Assertions will look like:
    // Assertion failed
    // Assertion failed: Foobar
    // Assertion failed: Foobar, [{"foo": "bar"}]
    // Assertion failed: Foobar, [{"foo": "bar"}], at `assert(x.foo.length < 2, "Foobar", x)`
    let assert_line = fail_message;
    if (user_message) {
        assert_line += `: ${user_message}`;
    }
    if (args.length > 0) {
        try {
            assert_line += ', ' + JSON.stringify(args);
        } catch (e) {}
    }

    const diagnostic = get_diagnostic();
    if (diagnostic) {
        throw new Error(assert_line + `, at ${diagnostic.file}:${diagnostic.line} \`${diagnostic.src}\``);
    } else {
        throw new Error(assert_line);
    }
}

export function assert<C>(c: C, message?: string, ...extra_info: any[]): asserts c {
    if (!c) {
        fail('Assertion failed', message, extra_info);
    }
}

export function unwrap<T>(x: T | undefined | null, message?: string, ...extra_info: any[]): T {
    if (x === undefined || x === null) {
        fail('Unwrap failed', message, extra_info);
    }
    return x;
}

// Take a type value that is maybe a string and ensure it is
// T is syntax sugar for unwrapping to a string union
export function unwrapString<T extends string>(x: any, message?: string, ...extra_info: any[]): T {
    if (!isString(x)) {
        fail('String unwrap failed', message, extra_info);
    }
    return x as T;
}
