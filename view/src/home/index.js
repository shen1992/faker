import React from 'react'
import { render } from 'react-dom'
import { Layout, Input, Button, message, Spin, Alert } from 'antd'
import axios from 'axios'

import './style.css'

const { Header, Content } = Layout
const { TextArea } = Input

export default class Home extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      name: '',
      url: '',
      loading: false,
      urlList: [],
      nameList: [],
      active: ''
    }
    this.loaded = false
    this.dataList = []
  }

  fetchList () {
    let {name, url, nameList} = this.state

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
      this.setState({loading: true})
      axios.get('/search.json', {
        params: {
          name,
          url,
      }}).then(resp => {
        this.loaded = false
        if (resp.status === 200) {
          let {list} = resp.data
          this.dataList = list

          list.forEach(item => {
            if (nameList.every(i => i !== item.name)) {
              nameList.push(item.name)
            }
          })
          this.setState({
            loading: false,
            nameList
          })
        }
      })
    }
  }

  exportCsv () {
    location.replace('/save.csv')
  }

  showList(name, i) {
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
    let {name, url, urlList, nameList, loading, active} = this.state
    let {dataList} = this
    
    return (
      <Layout>
        <Header className='header'>证道</Header>
        <Content className='content'>
          <Alert  banner={true} message='如果遇到某些网站搜索结果不正确，请联系我(泡泡:liangyaoguang@corp.netease.com)' type='info' />
          <section className='search'>
            <div className='leftText'>
              <p>请精确输入漫画的名字,多本漫画用,分隔:</p>
              <TextArea rows={15}  placeholder='例如:中国诡实录,人渣的本愿' value={name} 
                onChange={(e) => this.setState({name: e.target.value})} />
            </div>
            <div className='rightText'>
              <p>请输入要查询的网站，多个网址用,分隔:</p>
              <TextArea rows={15} placeholder='例如:http://www.bnmanhua.com/,http://www.gufengmh.com/' value={url} 
                onChange={(e) => this.setState({url: e.target.value})} />
            </div>
          </section> 
          <section className='btnContent'>
            <Button type='primary' className='btn' onClick={() => this.fetchList()}>查询</Button>
            {
              dataList.length 
                ? <Button onClick={() => this.exportCsv()} className='exportBtn'>导出Excel</Button> 
                : ''
            }
          </section>
            <Spin spinning={loading}>
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
            </Spin>
        </Content>
      </Layout>
    )
  }
}

render(
  <Home/>,
  document.getElementById('root')
)
