import { map } from "ramda";
import { AppExp, CExp, Exp, LetExp, Program }  from "./L31-ast";
import { isAppExp, isAtomicExp, isCExp, isDefineExp, isExp, isIfExp, isLetExp, isLitExp,
         isProcExp, isProgram, makeAppExp, makeDefineExp, makeIfExp, makeProcExp, makeProgram }  from "./L31-ast";
import { Result, bind, makeFailure, makeOk, mapResult, safe2, mapv } from "../shared/result";


/*
Purpose: rewrite a single LetExp as a lambda-application form
Signature: rewriteLet(cexp)
Type: [LetExp => AppExp]
*/
const rewriteLet = (e: LetExp): AppExp => {
    const vars = map((b) => b.var, e.bindings);
    const vals = map((b) => b.val, e.bindings);
    return makeAppExp(
            makeProcExp(vars, e.body),
            vals);
}


/*
Purpose: Transform L31 AST to L3 AST
Signature: l31ToL3(l31AST)
Type: [Exp | Program] => Result<Exp | Program>
*/
export const L31ToL3 = (exp: Exp | Program): Result<Exp | Program> =>
isProgram(exp) ? bind(mapResult(rewriteAllLetPlusExp, exp.exps),(exp: Exp[]) => makeOk(makeProgram(exp))) :
isExp(exp) ? rewriteAllLetPlusExp(exp) :
makeFailure("Failure");

const rewriteAllLetPlusExp = (exp: Exp): Result<Exp> =>
    isDefineExp(exp) ? bind(rewriteAllLetPlusCExp(exp.val), (val: CExp) => makeOk(makeDefineExp(exp.var, val))):
    rewriteAllLetPlusCExp(exp);

const rewriteAllLetPlusCExp = (exp: CExp): Result<CExp>=>
    isAtomicExp(exp) ? makeOk(exp) :
    isLitExp(exp) ? makeOk(exp) :
    isIfExp(exp) ? three_binds((test: CExp, then: CExp, alt: CExp) => makeOk( makeIfExp(test,then,alt)))
                             (rewriteAllLetPlusCExp(exp.test),
                             rewriteAllLetPlusCExp(exp.then),
                             rewriteAllLetPlusCExp(exp.alt)):
    isAppExp(exp) ? safe2((rator: CExp, rands: CExp[])=> makeOk(makeAppExp(exp.rator,exp.rands)))
                            (rewriteAllLetPlusCExp(exp.rator), mapResult(rewriteAllLetPlusCExp, exp.rands)):                      
    isProcExp(exp) ? bind(mapResult(rewriteAllLetPlusCExp, exp.body), (body: CExp[]) => makeOk(makeProcExp(exp.args,body))):
    isLetExp(exp) ? rewriteAllLetPlusCExp(rewriteLet(exp)) :
     makeFailure("error");




export const three_binds = <T1, T2, T3, T4>(f: (x: T1, y: T2, z: T3) => Result<T4>): (a: Result<T1>, b: Result<T2>, c: Result<T3>) => Result<T4> =>
    (a: Result<T1>, b: Result<T2>, c: Result<T3>) =>
        bind(a, (x: T1) => bind(b, (y: T2) => bind(c, (z: T3) => f(x, y, z))));





    

