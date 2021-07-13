import React, { Component } from 'react';
import { StyleSheet, FlatList, Text, View, RefreshControl, ActivityIndicator } from "react-native";
import NoData from './components/noData';
import PropTypes from 'prop-types';

//函数节流， 去重h
const Throttle = (fn, wait) => {
    var timer;
    return function (...args) {
        if (!timer) {
            timer = setTimeout(() => timer = null, wait);
            return fn.apply(this, args);
        }
    }
}

export default class PullFlatlist extends Component {
    static propTypes = {
        onRefresh: PropTypes.func,
        onLoadMore: PropTypes.func,
        disablePullToRefresh: PropTypes.bool,
        disableLoadMore: PropTypes.bool,
        dataSource: PropTypes.any // 为了兼容所以设置成any，请传入array
    }

    static defaultProps = {
        onRefresh: null,
        onLoadMore: null,
        disablePullToRefresh: false,
        disableLoadMore: false,
        dataSource: [],
    }

    // 为了兼容外部调用不crash所以设置该值
    static constants = {
        viewType: {

        }
    }

    constructor(props) {
        super(props);
        this.state = {
            isRefresh: props.isRefresh, // 是否正在刷新
            isLoadMore: props.isLoadMore, // 是否正在加载更多
            data: this.parseListViewDataSource(props.dataSource || []), // 数据源
            noMoreData: false, // 没有更多数据
        }
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            data: this.parseListViewDataSource(nextProps.dataSource)
        })
    }

    /**
     * 因为外部传入的dataSource是一个object，所以需要进行一下转换
     */
    parseListViewDataSource(dataSource) {
        if (dataSource instanceof Array) {
            return dataSource
        }

        if (dataSource._dataBlob) {
            // 特别处理
            dataSource = dataSource._dataBlob.s1 || []
            if (dataSource.length == 1 && dataSource[0].a == 'ab') {
                return []
            }

            return dataSource
        }

        return []
    }

    /**
     * 开始下拉刷新
     * @returns 
     */
    beginRefresh() {
        if (this.state.isRefresh) return
        this.setState({
            isRefresh: true,
            noMoreData: false
        }, () => {
            this.props.onRefresh && this.props.onRefresh()
        })
    }

    /**
     * 关闭下拉刷新
     * @returns 
     */
    endRefresh() {
        if (!this.state.isRefresh) return
        this.setState({
            isRefresh: false
        })
    }

    /**
     * 开始加载更多
     * @returns 
     */
    beginLoadMore() {
        if (this.state.isRefresh || this.state.isLoadMore || this.state.noMoreData) return

        this.setState({
            isLoadMore: true
        }, () => {
            this.props.onLoadMore && this.props.onLoadMore()
        })
    }

    /**
     * 结束加载更多
     * @param {*} noMoreData 
     */
    endLoadMore(noMoreData) {
        this.setState({
            noMoreData: noMoreData,
            isLoadMore: false
        })
    }

     // 做一个防抖，因为可能短时间内多次触发
     triggerLoadMore = Throttle(() => {
        this.beginLoadMore()
    }, 100)

    /**
     * FlatList的空视图
     * @returns 
     */
    renderEmpty() {
        //暂无相关结果，试试其他关键词吧
        if (this.state.isRefresh || this.state.isLoadMore) {
            return null;
        }
        if (this.props.renderEmpty) {
            return this.props.renderEmpty();
        }
        return <NoData title={this.props.emptyText} styl={this.props.emptyStyle || styles.emptyStyle} />

    }

    // cell
    renderItemView({ item, index }) {
        return this.props.renderRow(item, index)
    }

    // 加载更多的footer
    renderLoadMoreView() {
        if (this.props.disableLoadMore) {
            return null;
        }

        if (this.state.isRefresh) {
            return null;
        }

        if (!this.state.noMoreData && this.state.isLoadMore) {
            return <View style={styles.loadMore}>
                <ActivityIndicator
                    style={styles.indicator}
                    size={"large"}
                    color={"red"}
                    animating={true}
                />
                <Text>正在加载...</Text>
            </View>
        }

        if (this.state.data && (this.state.data.length > 0)) {
            return (
                <View style={styles.loadMore}>
                    <Text style={{ lineHeight: 40 }}>没有更多数据</Text>
                </View>
            )
        }

        return null;
    }

    render() {
        return (
            <FlatList
                backgroundColor={this.props.backgroundColor}
                key={this.props.key}
                showsVerticalScrollIndicator={this.props.showsVerticalScrollIndicator}
                keyExtractor={this.props.keyExtractor}
                data={this.state.data}
                renderItem={this.renderItemView.bind(this)}
                //设置下拉刷新样式
                refreshControl={
                    <RefreshControl
                        title={"Loading"} //android中设置无效
                        colors={["red"]} //android
                        tintColor={"red"} //ios
                        titleColor={"red"}
                        refreshing={this.state.isRefresh}
                        onRefresh={this.beginRefresh.bind(this)}
                    />
                }
                onEndReachedThreshold={0.1}

                //设置上拉加载
                ListFooterComponent={this.renderLoadMoreView.bind(this)}
                onEndReached={() => {
                    console.log('onEndReached')
                    this.triggerLoadMore()
                }}
                ListEmptyComponent={this.renderEmpty.bind(this)}
            />

        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    item: {
        backgroundColor: "#169",
        height: 200,
        margin: 15,
        justifyContent: "center",
        alignItems: "center"
    },
    text: {
        color: "red",
        fontSize: 20,
    },

    loadMore: {
        alignItems: "center"
    },
    indicator: {
        color: "red",
        margin: 10
    },
    emptyStyle: {
        marginTop: 30,
        justifyContent: "flex-start"
    }
});