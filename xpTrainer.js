/** @param {NS} ns */
export async function main(ns) {
  var server = ns.getServer();
  var maxRam = server.maxRam;
  var availableRam = maxRam - server.ramUsed;
  var tenPercentRam = maxRam * 0.1;

  if (tenPercentRam > availableRam) {
    ns.tprint("Need 10% available ram on server")
    return;
  }

  var ramCost = ns.getScriptRam("xpWeaken.js");
  var threads = Math.floor(tenPercentRam / ramCost);
  var pid = ns.run("xpWeaken.js", threads, ns.args[0]);
  ns.tail(pid);
}