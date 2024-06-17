// ==UserScript==
// @name         PKU-Hole export tool
// @author       WindMan
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @license      MIT License
// @description  导出树洞中的关注列表
// @match        https://treehole.pku.edu.cn/web/*
// @grant        none
// @run-at       document-end
// ==/UserScript==





function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function _getCookieObj() {
	var cookieObj = {};
	var cookieStr = document.cookie;
	var pairList = cookieStr.split(";");
	for (var _i = 0, pairList_1 = pairList; _i < pairList_1.length; _i++) {
		var pair = pairList_1[_i];
		var _a = pair.trim().split("="),
			key = _a[0],
			value = _a[1];
		cookieObj[key] = value;
	}
	return cookieObj;
}

async function followed_holes() {
	const fetchList = [];
	let pages = 60;
	for (let page = 1; page <= pages; ++page) {
		const response = await fetch(
			`https://treehole.pku.edu.cn/api/follow_v2?page=${page}&limit=25`,
			{
				headers: {
					accept: "application/json, text/plain, */*",
					"accept-language": "zh-CN,zh;q=0.9",
					authorization: `Bearer ${_getCookieObj()["pku_token"]}`,
					"sec-fetch-dest": "empty",
					"sec-fetch-mode": "cors",
					"sec-fetch-site": "same-origin",
					uuid: localStorage.getItem("pku-uuid"),
				},
				referrer: "https://treehole.pku.edu.cn/web/",
				referrerPolicy: "strict-origin-when-cross-origin",
				body: null,
				method: "GET",
				mode: "cors",
				credentials: "include",
			}
		);

		const data_ = await response.json();

		let data = data_.data.data;
		fetchList.push(data);

		if (data_.data.next_page_url == null) {
			break;
		}
		await sleep(50);
	}
	return fetchList;
}

async function comments(holeid) {
	const fetchList = [];
	let pages = 120;
	for (let page = 1; page <= pages; ++page) {
		const response = await fetch(
			`https://treehole.pku.edu.cn/api/pku_comment_v3/${holeid}?page=${page}&limit=15&sort=asc`,
			{
				headers: {
					accept: "application/json, text/plain, */*",
					"accept-language": "zh-CN,zh;q=0.9",
					authorization: `Bearer ${_getCookieObj()["pku_token"]}`,
					"sec-fetch-dest": "empty",
					"sec-fetch-mode": "cors",
					"sec-fetch-site": "same-origin",
					uuid: localStorage.getItem("pku-uuid"),
				},
				referrer: "https://treehole.pku.edu.cn/web/",
				referrerPolicy: "strict-origin-when-cross-origin",
				body: null,
				method: "GET",
				mode: "cors",
				credentials: "include",
			}
		);

		const data_ = await response.json();

		let data = data_.data.data;
		fetchList.push(data);

		if (data_.data.next_page_url == null) {
			break;
		}
		await sleep(20);
	}
	return fetchList;
}

async function get_hole(holeid) {
	const response = await fetch(
		`https://treehole.pku.edu.cn/api/pku/${holeid}/`,
		{
			headers: {
				accept: "application/json, text/plain, */*",
				"accept-language": "zh-CN,zh;q=0.9",
				authorization: `Bearer ${_getCookieObj()["pku_token"]}`,
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "same-origin",
				uuid: localStorage.getItem("pku-uuid"),
			},
			referrer: "https://treehole.pku.edu.cn/web/",
			referrerPolicy: "strict-origin-when-cross-origin",
			body: null,
			method: "GET",
			mode: "cors",
			credentials: "include",
		}
	);
	const data = await response.json();
	if (data.code != 20000) {
		return null;
	}
	return data.data;
}



function download_file(text, filename) {
	const blob = new Blob([text], { type: "text/plain" });

	const downloadLink = document.createElement("a");
	downloadLink.download = filename;
	downloadLink.href = URL.createObjectURL(blob);
	downloadLink.textContent = "Download";

	document.body.appendChild(downloadLink);
	downloadLink.click();
	URL.revokeObjectURL(downloadLink.href);
}

function comment2text(comments_) {
	if (comments_[0] != undefined) { // 排除没有评论的情况
		let buffer_ = "";
		for (let i = 0; i < comments_.length; i++) {
			let comment_list_ = comments_[i];
			for (let j = 0; j < comment_list_.length; j++) {
				let comment_ = comment_list_[j];
				buffer_ += `${comment_.name}: ${comment_.text}\n`;
			}
		}
		return buffer_;
	}
	return "";
}

async function extract_pid_from_text(text) {
	// extract pids from text
	if (text == null) {
		return [];
	}
	let regex = /\b\d{5,7}\b/g;
	let matches = text.match(regex);
	return matches;
}

async function process_extract(hole, comments_str, mode) {
	let pids = new Array();
	// mode > 1 (extract from text)
	if (mode > 1) {
		let pids_ = await extract_pid_from_text(hole.text);
		if (pids_ != null) {
			pids_.forEach(pid => pids.push(pid));
		}
	}
	// mode > 2 (extract from comments)
	if (mode > 2) {
		let pids_ = await extract_pid_from_text(comments_str);
		if (pids_ != null) {
			pids_.forEach(pid => pids.push(pid));
		}
	}
	return pids;
}

async function export_cited_holes(buttonElement, holeids, file_num) {
	let buffer = "";
	let holenum = 0;
	for (let i = 0; i < holeids.length; i++) {
		let holeid = holeids[i];
		let hole = await get_hole(holeid);

		if (hole && hole.pid) {
			console.log('===========');
			console.log(hole.pid);
			buffer += `Id:${hole.pid}  Likenum:${hole.likenum}  Reply:${hole.reply
				}  Time:${new Date(hole.timestamp * 1000).toLocaleString()}\n`;
			let comments_ = await comments(hole.pid);
			holenum += 1;
			buttonElement.textContent = holenum.toString();
			buffer += `洞主: ${hole.text}\n`;
			buffer += comment2text(comments_);
			buffer += "\n======================\n\n";
			sleep(10);
		}

		if ((i + 1) % 100 == 0 || i == holeids.length - 1) {
			download_file(buffer, (file_num + 1).toString() + "-export-cited.txt");
			file_num += 1;
			buffer = "";
		}
	}
}

async function export_followed_holes(buttonElement, mode) {
	// mode:
	// 1: just export followed holes
	// 2: export followed holes and holes in the text
	// 3: export followed holes and holes in the text and comments
	let buffer = "";
	let holenum = 0;
	let file_num = 0;
	let extracted_pids = new Array();
	let followsholes = await followed_holes();
	// unroll
	let holes = [];
	for (let i = 0; i < followsholes.length; i++) {
		let holelist = followsholes[i];
		for (let j = 0; j < holelist.length; j++) {
			holes.push(holelist[j]);
		}
	}




	for (let i = 0; i < holes.length; i++) {
		let hole = holes[i];
		console.log('===========');
		console.log(hole.pid);
		buffer += `Id:${hole.pid}  Likenum:${hole.likenum}  Reply:${hole.reply
			}  Time:${new Date(hole.timestamp * 1000).toLocaleString()}\n`;
		let comments_ = await comments(hole.pid);
		holenum += 1;
		buttonElement.textContent = holenum.toString();
		buffer += `洞主: ${hole.text}\n`;
		buffer += comment2text(comments_);
		buffer += "\n======================\n\n";

		let extracted_pids_ = await process_extract(hole, buffer, mode);
		extracted_pids_.forEach(pid => extracted_pids.push(pid));

		sleep(10);
		if ((i + 1) % 100 == 0 || i == holes.length - 1) {
			download_file(buffer, (file_num + 1).toString() + "-export.txt");
			file_num += 1;
			buffer = "";
		}
	}
	// download cited holes
	if (extracted_pids.length > 0) {
		alert("关注列表导出完成，现在导出被引用树洞");
		console.log("extracted pids:");
		console.log(extracted_pids);
		await export_cited_holes(buttonElement, extracted_pids, file_num);

	}
}

async function export_(buttonElement) {
	console.log("export.");
	// get settings from user
	const confirm_ = confirm(
		"是否确定要导出关注列表？\n" +
		"每导出100条树洞生成一个文件\n" + 
		"导出时会实时显示导出树洞的数目" + 
		"\n若想要停止导出,直接刷新浏览器界面即可"
	);
	if (!confirm_) {
		alert("已取消导出");
		return;
	}

	let mode = prompt("请选择导出模式：\n" +
		"1. 【仅导出】您关注的树洞（默认）\n" +
		"2. 导出您关注的树洞以及在树洞【正文中】被引的洞\n" +
		"3. 导出您关注的树洞以及在树洞【正文和评论中】被引的洞\n" +
		"请输入1-3中的一个数字以选定模式"
		, "1");

	// bad result
	if (mode === "0") {
		alert("已取消导出");
		return;
	}
	if (!['1', '2', '3'].includes(mode)) {
		alert("输入错误，请重新运行脚本并输入正确的数字");
		return;
	}

	if (confirm_) {
		buttonElement.textContent = "稍候";
		await export_followed_holes(buttonElement, parseInt(mode));
		buttonElement.textContent = "导出";
	}

}

(window.onload = function () {
	"use strict";
	let exporting = false;
	const selectElement = document.querySelector(".select-header.control-search");
	const buttonElement = document.createElement("button");
	buttonElement.textContent = "导出";
	buttonElement.style.minWidth = "60px";
	buttonElement.addEventListener("click", async function () {

		if (!exporting) {
			exporting = true;
			await export_(this);
			exporting = false;
		}
	});
	if (selectElement) {
		selectElement.insertAdjacentElement("afterend", buttonElement);
		selectElement.style.width = "50%";
	}
})();
