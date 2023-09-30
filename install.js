/** @param {NS} ns */
//Install scripts for playing bitburner
export async function main(ns) {
	await ns.wget("https://raw.githubusercontent.com/jhaslund/BitburnerScripts/main/manager.js", "manager.js");
	await ns.wget("https://raw.githubusercontent.com/jhaslund/BitburnerScripts/main/autoinfiltrate.js", "autoinfiltrate.js");
	await ns.wget("https://raw.githubusercontent.com/jhaslund/BitburnerScripts/main/listMoneyServers.js", "listMoneyServers.js");
	await ns.wget("https://raw.githubusercontent.com/jhaslund/BitburnerScripts/main/xpTrainer.js", "xpTrainer.js");
	await ns.wget("https://raw.githubusercontent.com/jhaslund/BitburnerScripts/main/rootAll.js", "rootAll.js
	await ns.wget("https://raw.githubusercontent.com/jhaslund/BitburnerScripts/main/pWeaken.js", "pWeaken.js");
	
	await ns.wget("https://raw.githubusercontent.com/5p0ng3b0b/bitburner-scripts/main/devmenu.js", "devmenu.js");
	await ns.wget("https://raw.githubusercontent.com/alainbryden/bitburner-scripts/main/git-pull.js", "git-pull.js");
	await ns.exec("git-pull.js", "home");
}
