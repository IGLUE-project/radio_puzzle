console.log("Init task: Update Escapp library");

import { resolve } from 'path';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory
const escapp_library_path = resolve(__dirname, '../../escapp_client');

if(!existsSync(escapp_library_path)){
  //Abort
  console.log("Escapp library not found");
  console.log(escapp_library_path);
  throw new Error("Escapp library not found");
}

let commands = [];
commands.push('cd ' + escapp_library_path + ' && npm run build');

let apps = ['../'];
for(let i=0; i<apps.length; i++){
	let app_path = resolve(__dirname, apps[i]);
	if(!existsSync(app_path)){
		//Abort
		console.log("App not found: " + app_path);
		throw new Error("App not found: " + app_path);
	}
	commands.push('cp ' + escapp_library_path + '/dist/escapp.js ' + app_path + '/public/escapp.js');
	commands.push('cp ' + escapp_library_path + '/dist/escapp.css ' + app_path  + '/public/css/escapp.css');
	commands.push('cp ' + escapp_library_path + '/dist/images/* ' + app_path  + '/public/images/');
	commands.push('cp ' + escapp_library_path + '/dist/escapp.js.LICENSE ' + app_path + '/public/escapp.js.LICENSE');
}

for(let j=0; j<commands.length; j++){
	console.log("Executing command");
	console.log(commands[j]);
	let stdout = execSync(commands[j]);
	console.log(`${stdout}`);
}

console.log("Task finished");