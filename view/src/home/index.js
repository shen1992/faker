import React from 'react'
import { render } from 'react-dom'
import { Layout, Input, Button, message, Alert } from 'antd'
import io from 'socket.io-client'

import './style.css'

const { Header, Content } = Layout
const { TextArea } = Input

export default class Home extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      name: '',
      url: '',
      urlList: [],
      nameList: [],
      active: 0,
      loading: false
    }
    this.loaded = false
    this.dataList = []
    this.first = false
  }

  componentWillMount() {
    this.socket = io('http://localhost:9527')
  }

  componentDidMount() {
    let {nameList} = this.state
    let {socket} = this
    
    socket.on('fetch', (list) => {
      if (this.dataList.every(i => i.url !== list[0].url)) {
        this.dataList = this.dataList.concat(list)
      }
      this.loaded = false
      list.forEach(item => {
        if (nameList.every(i => i !== item.name)) {
          nameList.push(item.name)
        }
      })
      this.setState({
        nameList
      }, () => {
        if (!this.first) {
          this.first = true
          this.showList(nameList[0])
        }
      })
    })
    socket.on('end', () => {
      this.setState({loading: false})
      message.success('数据抓取完毕！')
    })
  }

  fetchList () {
    let {name, url} = this.state
    let {socket} = this

    if (!name) {
      message.warning('请输入漫画名字！')
      return
    }
    
    if (!url) {
      message.warning('请输入要查询的地址！')
      return
    }

    if (!this.loaded) {
      this.loaded = true
      socket.emit('crawler', {name, url})
      this.setState({loading: true})
    }
  }

  exportCsv () {
    location.replace('/save.csv')
  }

  showList(name, i = 0) {
    let url = []
    let {dataList} = this

    dataList.forEach(item => {
      if (item.name === name) {
        url.push({
          url: item.url,
          addr: item.addr
        })
      }
    })
    this.setState({
      urlList: url,
      active: i
    })
  }

  render () {
    let {name, url, urlList, nameList, active, loading} = this.state
    let {dataList} = this

    return (
      <Layout>
        <Header className='header'>证道</Header>
        <Content className='content'>
          <Alert  banner={true} showIcon message='如果遇到某些网站搜索结果不正确，请联系我(泡泡:liangyaoguang@corp.netease.com)' type='warning' />
          <section className='search'>
            <div className='leftText'>
              <p>请精确输入漫画的名字,多本漫画用；分隔</p>
              <TextArea rows={10} placeholder='例如:中国诡实录；人渣的本愿' value={name} 
                onChange={(e) => this.setState({name: e.target.value})} />
            </div>
            <div className='rightText'>
              <p>请输入要查询的网站，多个网址用；分隔</p>
              <TextArea rows={10} placeholder='例如:http://www.bnmanhua.com/；http://www.gufengmh.com/' value={url} 
                onChange={(e) => this.setState({url: e.target.value})} />
            </div>
          </section> 
          <section className='btnContent'>
            <Button type='primary' className='btn' onClick={() => this.fetchList()}>查询</Button>
            {
              loading && <Alert message='正在抓取数据！' type='info' showIcon className='info' />
            }
            {
              dataList.length 
                ? <Button onClick={() => this.exportCsv()} className='exportBtn'>导出Excel</Button> 
                : ''
            }
          </section>
          <footer className='footer'>
            <ul className='nameList'>
              <p>点击漫画名字查看地址</p>
              {
                nameList.map((item, i) => {
                  return (<li key={i} className={active === i ? 'active': ''} onClick={() => this.showList(item, i)}>{item}</li>)
                })
              }
            </ul>
            <ul className='urlList'>
              <p>地址列表</p>
              {
                urlList.map((item, i) => {
                  return (
                    <li key={i}>
                      <span className='footer_addr'>网站地址：</span>
                      {item.addr}
                      <span className='footer_addr'>漫画地址：</span>
                      {item.url}
                    </li>
                  )
                })
              }
            </ul>
          </footer>
        </Content>
      </Layout>
    )
  }
}

render(
  <Home/>,
  document.getElementById('root')
)
