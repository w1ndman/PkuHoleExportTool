// ==UserScript==
// @name         PKU-Hole export tool
// @author       WindMan
// @namespace    http://tampermonkey.net/
// @version      1.0
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

function download_file(text,filename) {
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
    if(comments_[0] != undefined) { // 排除没有评论的情况
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
}

async function export_holes(buttonElement) {
	let buffer = "";
	let holenum = 0;
	let file_num = 0
	let followsholes = await followed_holes();
	let i = 0;
	for (; i < followsholes.length; i++) {
		let holelist = followsholes[i];
		let buffer_ = "";
		for (let j = 0; j < holelist.length; j++) {
			let hole = holelist[j];
            console.log('===========');
            console.log(hole.pid);
			buffer_ += `Id:${hole.pid}  Likenum:${hole.likenum}  Reply:${hole.reply
				}  Time:${new Date(hole.timestamp * 1000).toLocaleString()}\n`;
			let comments_ = await comments(hole.pid);
			holenum += 1;
			buttonElement.textContent = holenum.toString();
			buffer_ += `洞主: ${hole.text}\n`;
			buffer_ += comment2text(comments_);
			buffer_ += "\n======================\n\n";
		}
		buffer += buffer_;
		if ((i+1)%4 == 0) {
			download_file(buffer,(file_num+1).toString()+"-export.txt");
			file_num += 1;
			buffer = "";
		}
	}
	if ((i+1)%4 != 0) {
		download_file(buffer,(file_num+1).toString()+"-export.txt");	
	}
}

async function export_(buttonElement) {
	console.log("export.");
	buttonElement.textContent = "稍候";
	const confirm_ = confirm(
		'是否确定要导出关注列表？\n每100条树洞下载一次文件\n导出时会实时显示导出树洞的数目\n若想要停止导出,直接刷新浏览器界面即可'
	);
	if (confirm_) {
		await export_holes(buttonElement);
	}
	buttonElement.textContent = "导出";

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
