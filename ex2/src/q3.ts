import {  Exp, Program, isProgram, isExp , isDefineExp, isNumExp, isBoolExp, isPrimOp, isVarRef, isAppExp, isProcExp, isLetExp, isIfExp, isLitExp, Binding, CExp, makeLetExp, makeBinding, makeProcExp, makeIfExp, makeAppExp, makeProgram, makeDefineExp, isLetPlusExp } from "./L31-ast";
import { Result, makeFailure, makeOk, safe2, mapResult, bind } from "../shared/result";
import { map, zipWith } from "ramda";



/*
Purpose: Transform L31 AST to L3 AST
Signature: l31ToL3(l31AST)
Type: [Exp | Program] => Result<Exp | Program>
*/
export const L31ToL3 = (exp: Exp | Program): Result<Exp | Program> =>
    isProgram(exp) ? bind(mapResult(L31ExpToL3, exp.exps), (exps: Exp[]) => makeOk(makeProgram(exps))) :
    isExp(exp) ? L31ExpToL3(exp) :
    makeFailure("Wrong input");

export const L31ExpToL3 = (exp: Exp): Result<Exp> =>
    isDefineExp(exp) ? bind(L31CExpToL3(exp.val), (val: CExp) => makeOk(makeDefineExp(exp.var, val))) :
    L31CExpToL3(exp);


export const L31CExpToL3 = (exp: CExp): Result<CExp> =>
    isNumExp(exp) ? makeOk(exp) :
    isBoolExp(exp) ? makeOk(exp) :
    isPrimOp(exp) ? makeOk(exp) :
    isVarRef(exp) ? makeOk(exp) :
    isAppExp(exp) ? safe2((rator: CExp, rands: CExp[]) => makeOk(makeAppExp(rator, rands)))
                        (L31CExpToL3(exp.rator), mapResult(L31CExpToL3, exp.rands)) :
    isIfExp(exp) ? makeOk((makeIfExp((exp.test),(exp.then),(exp.alt)))):
    isProcExp(exp) ? bind(mapResult(L31CExpToL3, exp.body), (body: CExp[]) => makeOk(makeProcExp(exp.args, body))) :
    isLetExp(exp) ? safe2((vals : CExp[], body: CExp[]) => makeOk(makeLetExp(zipWith(makeBinding,map(binding => binding.var.var, exp.bindings), vals), body)))
               (mapResult((binding : Binding ) => L31CExpToL3(binding.val), exp.bindings), mapResult(L31CExpToL3,exp.body)) :
    isLetPlusExp(exp) ? 
    isLitExp(exp) ? makeOk(exp) :
    makeFailure(`Unexpected CExp: ${exp.tag}`);



    

