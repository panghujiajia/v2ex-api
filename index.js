const express = require('express');
const rp = require('request-promise');
const cheerio = require('cheerio');

const app = express();

app.all('*', function (req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	//允许的header类型
	res.header('Access-Control-Allow-Headers', '*'); //跨域允许的请求方式
	res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS'); // 可以带cookies
	next();
});

const url = 'https://cdn.v2ex.co';

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
	const data = await getTabTopics(tab);
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

getTopicDetail = async id => {
	try {
		const res_detail = rp(`${url}/api/topics/show.json?id=${id}`);
		const res_replys = rp(`${url}/api/replies/show.json?topic_id=${id}`);
		const data = await Promise.all([res_detail, res_replys]);
		if (data && data.length) {
			const detail = JSON.parse(data[0]);
			const replys = JSON.parse(data[1]);
			if (replys && replys.length) {
				const len = replys.length;
				for (let i = 0; i < len; i++) {
					const item = replys[i];
					const is_master = item.member.id === id;
					item.user = {
						is_master,
						index: i + 1,
						id: item.member.id,
						author: item.member.username,
						last_reply: item.last_modified,
						avatar_url: item.member.avatar_mini,
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
				last_reply: item.find($('.topic_info span')).attr('title'),
				replyer: item
					.find($('.topic_info strong'))
					.last()
					.children()
					.text(),
			};
			data.push(obj);
		}
		console.log(data);
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
				last_reply: item.find($('.topic_info span')).attr('title'),
				replyer: item
					.find($('.topic_info strong'))
					.last()
					.children()
					.text(),
			};
			data.push(obj);
		}
		console.log(data);
		return data;
	} catch (error) {
		return false;
	}
};

app.listen(8888, () => {
	console.log('正在监听8888端口');
});
