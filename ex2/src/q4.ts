import { isSymbolSExp, isEmptySExp, isCompoundSExp, valueToString } from '../imp/L3-value';
import exp from "constants";
import { map, zipWith } from "ramda";
import { VarDecl, LitExp, AppExp, CExp, Exp, ProcExp, LetExp, makeLetExp, makeLetPlusExp, Program, PrimOp } from "./L31-ast";
import {
    isVarRef, isStrExp, isPrimOp, isBoolExp, isNumExp, isAppExp, isAtomicExp, isCExp, isDefineExp, isExp, isIfExp, isLetExp, isLitExp,
    isProcExp, isProgram, makeAppExp, makeDefineExp, makeIfExp, makeProcExp, makeProgram, makeBinding, Binding, isLetPlusExp, LetPlusExp
} from "./L31-ast";
import { Result, bind, makeFailure, makeOk, mapResult, safe2, mapv } from "../shared/result";
import { makeBox, unbox } from "../shared/box";
import { first } from '../shared/list';

/*
Purpose: Transform L3 AST to JavaScript program string
Signature: l30ToJS(l2AST)
Type: [EXP | Program] => Result<string>
*/
export const l30ToJS = (exp: Exp | Program): Result<string> =>
    L30tojsExp(exp);



export const ProcExptoJS = (pe: ProcExp): Result<string> =>
    bind(L30tojsExp(pe.body[0]), body => makeOk("(" + "(" +
        map((p) => p.var, pe.args).join(",") + ")" + " => " + body + ")"));


export const L30tojsExp = (exp: Program | Exp): Result<string> =>
    isProgram(exp) ? bind(mapResult(L30tojsExp, exp.exps), exps => makeOk(exps.join(";\n"))) :
        isBoolExp(exp) ? makeOk(exp.val ? 'True' : 'False') :
            isNumExp(exp) ? makeOk(exp.val.toString()) :
                isStrExp(exp) ? makeOk(`\"${exp.val}\"`) :
                    isLitExp(exp) ? makeOk(`Symbol.for(\"${valueToString(exp.val)}\")`) :
                        isVarRef(exp) ? makeOk(exp.var) :
                            isDefineExp(exp) ? bind(L30tojsExp(exp.val), val => makeOk(`const ${exp.var.var} = ${val}`)) :
                                isProcExp(exp) ? ProcExptoJS(exp) : // lambda (a b c d) (* (+ a b) (- c d)) --> (c - d) * (a + b)
                                    isIfExp(exp) ? three_binds((test: string, then: string, alt: string) => makeOk(`(${test} ? ${then} : ${alt})`))
                                        (l30ToJS(exp.test), l30ToJS(exp.then), l30ToJS(exp.alt)) :
                                        isPrimOp(exp) ? makeOk(Optojs(exp.op)) :
                                            isAppExp(exp) ? (
                                                isPrimOp(exp.rator) ? Optojscomplicated(exp.rator, exp.rands) :
                                                    safe2((rator: string, rands: string[]) => makeOk(`${rator}(${rands.join(",")})`))
                                                        (L30tojsExp(exp.rator), mapResult(L30tojsExp, exp.rands))
                                            ) :
                                                isLetExp(exp) ? L30tojsExp(rewriteLet(exp)) :
                                                    makeFailure("fail");

export const Optojs = (rator: string): string =>
    rator === "=" || rator === "eq?" ? "===" :
        rator === "number?" ? "((x) => (typeof (x) === number))" :
            rator === "boolean?" ? "((x) => (typeof(x) === boolean))" :
                rator === "symbol?" ? "((x) => (typeof (x) === symbol))" :
                    rator === "string?" ? "((x) => (typeof(x) === string))" :
                        rator;

export const Optojscomplicated = (rator: PrimOp, rands: CExp[]): Result<string> =>
    rator.op === "number?" || rator.op === "boolean?" || rator.op === "symbol?" || rator.op === "string?" ? bind(L30tojsExp(rands[0]), (rand: string) => makeOk(`${Optojs(rator.op)}(${rand})`)) :
        rator.op === "not" ? bind(L30tojsExp(rands[0]), (rand: string) => makeOk("(!" + rand + ")")) :
            rator.op === "'" ? bind(L30tojsExp(rands[0]), (rand: string) => makeOk(`(\"${rand}\")`)) :
                rator.op === "string=?" ? bind(mapResult(l30ToJS, rands), (rands: string[]) => makeOk(`(${rands[0]} === ${rands[1]})`)) :
                    bind(mapResult(L30tojsExp, rands), (rands) => makeOk("(" + rands.join(" " + Optojs(rator.op) + " ") + ")"));


export const three_binds = <T1, T2, T3, T4>(f: (x: T1, y: T2, z: T3) => Result<T4>): (a: Result<T1>, b: Result<T2>, c: Result<T3>) => Result<T4> =>
    (a: Result<T1>, b: Result<T2>, c: Result<T3>) =>
        bind(a, (x: T1) => bind(b, (y: T2) => bind(c, (z: T3) => f(x, y, z))));

const rewriteLet = (e: LetExp): AppExp => {
    const vars = map((b) => b.var, e.bindings);
    const vals = map((b) => b.val, e.bindings);
    return makeAppExp(
        makeProcExp(vars, e.body),
        vals);
}

/*
Purpose: rewrite all occurrences of let in an expression to lambda-applications.
Signature: rewriteAllLet(exp)
Type: [Program | Exp -> Program | Exp]
*/
export const rewriteAllLet = (exp: Program | Exp): Program | Exp =>
    isExp(exp) ? rewriteAllLetExp(exp) :
        isProgram(exp) ? makeProgram(map(rewriteAllLetExp, exp.exps)) :
            exp;

const rewriteAllLetExp = (exp: Exp): Exp =>
    isCExp(exp) ? rewriteAllLetCExp(exp) :
        isDefineExp(exp) ? makeDefineExp(exp.var, rewriteAllLetCExp(exp.val)) :
            exp;

const rewriteAllLetCExp = (exp: CExp): CExp =>
    isAtomicExp(exp) ? exp :
        isLitExp(exp) ? exp :
            isIfExp(exp) ? makeIfExp(rewriteAllLetCExp(exp.test),
                rewriteAllLetCExp(exp.then),
                rewriteAllLetCExp(exp.alt)) :
                isAppExp(exp) ? makeAppExp(rewriteAllLetCExp(exp.rator),
                    map(rewriteAllLetCExp, exp.rands)) :
                    isProcExp(exp) ? makeProcExp(exp.args, map(rewriteAllLetCExp, exp.body)) :
                        isLetExp(exp) ? rewriteAllLetCExp(rewriteLet(exp)) :
                            exp;