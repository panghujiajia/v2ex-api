const express = require('express');
const rp = require('request-promise');
const cheerio = require('cheerio');
const axios = require('axios');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
require('dayjs/locale/zh');
dayjs.locale('zh');
dayjs.extend(relativeTime);

const app = express();

app.all('*', function (req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	//允许的header类型
	res.header('Access-Control-Allow-Headers', '*'); //跨域允许的请求方式
	res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS'); // 可以带cookies
	next();
});

const url = 'https://cdn.v2ex.co';

const proxy = {
	host: '127.0.0.1',
	port: 7890,
};

app.get('/', (req, res) => {
	res.send('hello world');
});

app.get('/api/topics/tab', async (req, res) => {
	const { tab } = req.query;
	if (!tab) {
		res.send({
			status: 400,
			message: '请求参数错误',
		});
		return;
	}
	let data = [];
	if (tab === 'top') {
		data = await getHotTopics();
	} else {
		data = await getTabTopics(tab);
	}
	res.send({
		status: 200,
		message: '请求成功',
		data,
	});
});

app.get('/api/topics/all', async (req, res) => {
	const { tab, p } = req.query;
	if (!tab || !p) {
		res.send({
			status: 400,
			message: '请求参数错误',
		});
		return;
	}
	const data = await getAllTopics(tab, p);
	res.send({
		status: 200,
		message: '请求成功',
		data,
	});
});

app.get('/api/topics/detail', async (req, res) => {
	const { id } = req.query;
	if (!id) {
		res.send({
			status: 400,
			message: '请求参数错误',
		});
		return;
	}
	const data = await getTopicDetail(id);
	res.send({
		status: 200,
		message: '请求成功',
		data,
	});
});

getHotTopics = async () => {
	try {
		const res = await rp(`${url}/api/topics/hot.json`);
		const list = JSON.parse(res);
		const len = list.length;
		if (list && len) {
			const data = [];
			let i = 0;
			for (; i < len; i++) {
				const item = list[i];
				data.push({
					id: item.id, // id
					reply_num: item.replies, // 回复数
					title: item.title, // 标题
					last_reply: dayjs(item.last_modified * 1000).fromNow(), // 最后回复时间
					author: item.member.username, // 作者名
					avatar: item.member.avatar_mini, // 头像地址
					tag_value: item.node.name, // node地址
					tab_name: item.node.title, // node名
				});
			}
			return data;
		}
		return false;
	} catch (error) {
		return false;
	}
};

getTopicDetail = async id => {
	try {
		const res_detail = rp(`${url}/api/topics/show.json?id=${id}`);
		const res_replys = rp(`${url}/api/replies/show.json?topic_id=${id}`);
		const data = await Promise.all([res_detail, res_replys]);
		if (data && data.length) {
			const detail = JSON.parse(data[0]);
			const replys = JSON.parse(data[1]);
			const master_id = detail[0].member.id;
			if (replys && replys.length) {
				const len = replys.length;
				for (let i = 0; i < len; i++) {
					const item = replys[i];
					const is_master = item.member.id === master_id;
					item.user = {
						is_master,
						index: i + 1,
						id: item.member.id,
						author: item.member.username,
						last_reply: dayjs(item.last_modified * 1000).fromNow(),
						avatar: item.member.avatar_mini,
					};
				}
				return { detail, replys };
			}
		}
		return false;
	} catch (error) {
		return false;
	}
};

getTabTopics = async tab => {
	try {
		const res = await rp(`${url}?tab=${tab}`);
		const $ = cheerio.load(res);
		const list = $('#Main .box').find($('.item'));
		const len = list.length;
		const data = [];
		let i = 0;
		for (; i < len; i++) {
			const item = $(list[i]);
			const href = item.find($('.topic-link')).attr('href');
			const obj = {
				id: href.replace(/\/t\/(.*?)#.*/g, '$1'),
				title: item.find($('.topic-link')).text(),
				reply_num: item.find($('.count_livid')).text() || 0,
				tab_name: item.find($('.node')).text(),
				author: item
					.find($('.topic_info strong'))
					.first()
					.children()
					.text(),
				avatar: item.find($('.avatar')).attr('src'),
				last_reply: dayjs(
					item.find($('.topic_info span')).attr('title')
				).fromNow(),
				replyer: item
					.find($('.topic_info strong'))
					.last()
					.children()
					.text(),
			};
			data.push(obj);
		}
		return data;
	} catch (error) {
		return false;
	}
};

getAllTopics = async (tab, p) => {
	try {
		const res = await rp(`${url}/go/${tab}?p=${p}`);
		const $ = cheerio.load(res);
		const list = $('#TopicsNode').find($('.cell'));
		const len = list.length;
		const data = [];
		let i = 0;
		for (; i < len; i++) {
			const item = $(list[i]);
			const href = item.find($('.topic-link')).attr('href');
			const obj = {
				id: href.replace(/\/t\/(.*?)#.*/g, '$1'),
				title: item.find($('.topic-link')).text(),
				reply_num: item.find($('.count_livid')).text() || 0,
				author: item
					.find($('.topic_info strong'))
					.first()
					.children()
					.text(),
				avatar: item.find($('.avatar')).attr('src'),
				last_reply: dayjs(
					item.find($('.topic_info span')).attr('title')
				).fromNow(),
				replyer: item
					.find($('.topic_info strong'))
					.last()
					.children()
					.text(),
			};
			data.push(obj);
		}
		return data;
	} catch (error) {
		return false;
	}
};

app.listen(8888, () => {
	console.log('正在监听8888端口');
});
