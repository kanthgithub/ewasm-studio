import React, { Component } from 'react';
import logo from './logo.svg';
import {Web3} from 'web3'
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Icon from '@material-ui/core/Icon'
import {PulseLoader} from 'react-spinners';
import TxModal from './components/TxModal';

import './App.css';

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      wast: '',
      anchorEl: null,
      placeholderText: "Contract Code (WAST)",
      //TxType: 'Transaction', // switches to Transaction when user enters a destination address
      TxType: 'Contract', // default to Contract type
      txModalOpen: false,
      txStatusText: "Submit Transaction",
      loading: false,
      warningText: '',
      txReceipt: null,
      addrRows: 2
    }

    //alert(binaryen)
    this.handleChange = this.handleChange.bind(this)
    //this.handleClose = this.handleClose.bind(this)
    //this.onSelectChange = this.onSelectChange.bind(this)
    this.setContract = this.setContract.bind(this)
    this.setTx = this.setTx.bind(this)
    this.onTx = this.onTx.bind(this)
    this.handleTxModalClose = this.handleTxModalClose.bind(this)
    this.onAddressChange = this.onAddressChange.bind(this)
    this.onBlur = this.onBlur.bind(this)
    this.onValueUpdated = this.onValueUpdated.bind(this)
    //this.handleChange = this.handleChange.bind(this);
    //this.handleSubmit = this.handleSubmit.bind(this);

    //this.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545')
    //this.web3 = new Web3(this.web3Provider)
  }

  onBlur(e) {
    let leftPad = 40 - e.target.value.length;
    if (leftPad > 0) {
      e.target.value = "0".repeat(leftPad) + e.target.value;
    }

    this.setState({
      to: e.target.value
    })
  }

  onAddressChange(e) {
    if (e.target.value !== "") {
      console.log('calling setTx...')
      this.setTx()
      this.setState({
        addrRows: 1
      })
    }
    if (e.target.value === "") {
      console.log('calling setContract...')
      this.setContract()
      this.setState({
        addrRows: 2
      })
    }

    this.setState({
      to: e.target.value
    })
  }

  handleChange(e) {
    this.setState({
      wast: e.target.value
    })
  }

  handleTxModalClose() {
    this.setState({txModalOpen: false})
  }

  onSubmitTx(e) {
    console.log('onSubmitTx clicked.')
    function buf2hex(buffer) { // buffer is an ArrayBuffer
      return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    }

    function isValidAddress(address) {
      if (address.substr(0, 2) != '0x')
        address = '0x' + address;
      return /^0x[0-9a-fA-F]{40}$/.test(address);
    }

    function getReceipt(thisObj, tx) {
      thisObj.state.web3.eth.getTransactionReceipt(tx, (e, receipt) => {
        if (e) throw(e)
        if (receipt) {
          thisObj.setState({
            txModalOpen: true,
            txReceipt: receipt,
            TxStatusText: "Submit Transaction",
            loading: false
          })
        } else {
          setTimeout(getReceipt(thisObj, tx), 300)
        }
      })
    }

/*
    this.setState({
      txStatusText: "Transaction Pending"
    })

*/
    // Validate address
    if (this.state.TxType === 'Transaction' && !isValidAddress(this.state.to)) {
      alert('Invalid address');
      return;
    }

    let wasm = ''
    let wast = ""

    if (this.state.wast.length > 0 && !this.state.to) {
      try {
        let module = window.Binaryen.parseText(this.state.wast)
        wasm = buf2hex(module.emitBinary())
      } catch (e) {
        alert(e)
        return
      }

      if (this.state.TxType == 'Contract') {
        //contract creation transaction

        for (let i = 0; i < wasm.length; i += 2) {
          wast += "\\" + wasm.slice(i, i + 2)
        }

        console.log(wast)
        wast = `(module (import "ethereum" "finish" (func $finish (param i32 i32))) (memory 100) (data (i32.const 0)  "${wast}") (export "memory" (memory 0)) (export "main" (func $main)) (func $main (call $finish (i32.const 0) (i32.const ${wasm.length / 2}))))`

        try {
          let module = window.Binaryen.parseText(wast)
          wasm = buf2hex(module.emitBinary())
        } catch (e) {
          alert(e)
          return
        }
      }
    } else {
      wasm = this.state.wast
    }

    // this might be a problem, because it triggers a re-render..
    this.setState({loading: true})

    let txn = {}

    if (wasm.length > 0)
      txn.data = wasm

    if (this.state.to)
      txn.to = this.state.to

    console.log('this.state.value:', this.state.value)
    if (this.state.value) {
      let value = parseInt(this.state.value)
      if (!value) {
        alert("must input number as value")
        throw("foobar")
      } else {
        console.log('got tx value:', value)
        txn.value = value
      }
    }

    this.state.web3.eth.sendTransaction(txn, (e, tx) => {
      if (e) throw(e)

      getReceipt(this, tx)

    })
  }

  onTx(tx) {
    this.setState({txModalOpen: true, loading: false, txData: tx})
  }

  onValueUpdated(e) {
    console.log('onValueUpdated:', e.target.value)
    this.setState({
      value: e.target.value
    })
  }

  componentWillMount() {
    window.addEventListener('load', () => {
      this.setState({
        web3: window.web3
      })
    })
    this.setState({ anchorEl: null });

  }

  onSelectChange(e) {
    this.setState({
      placeholderText: e.target.selectedOptions[0].value
    })
  }

  handleClose = event => {
    this.setState({ anchorEl: null});
  };

  setContract = event => {
    this.setState({
      placeholderText: "Contract Code (WAST)",
      TxType: 'Contract'
    })
    this.setState({ anchorEl: null });
  }

  setTx = event => {
    this.setState({
      placeholderText: "Transaction Data",
      TxType: 'Transaction'
    })
    this.setState({ anchorEl: null });
  }

  handleClick = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  render() {
    const {anchorEl} = this.state;
    if ((typeof this.state.web3) === 'undefined') {
      this.state.warningText = 'WARNING: Metamask (Web3) not detected!';
    } else {
      this.state.warningText = '';
    }
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to the Ewasm testnet!</h1>
        </header>
        <div style={{display: "flex", "flex-direction": "column", margin: "auto", width: "600px"}} >
          <h3 style={{"text-align": "left", "color": "red"}}>{this.state.warningText}</h3>
          {/*
          <h2 style={{"text-align": "left"}}> Transaction Type </h2>
          <div>
            <Button
              aria-owns={anchorEl ? 'simple-menu' : null}
              aria-haspopup="true"
              onClick={this.handleClick}
              style={{"float": "left"}}
            >
              {this.state.TxType}
              <Icon right>expand_more</Icon>
            </Button>
            <Menu
              id="simple-menu"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={this.handleClose}
            >
              <MenuItem onClick={this.setTx}>Normal Transaction</MenuItem>
              <MenuItem onClick={this.setContract}>Contract Creation</MenuItem>
            </Menu>
          </div>
          */}
          <h2 style={{"text-align": "left"}}> Destination Address</h2>
          <textarea
            placeholder="Enter an address to send normal transaction. Leave blank to send contract creation tx."
            onChange={this.onAddressChange}
            onBlur={this.onBlur}
            style={{"background-color": this.state.TxType === "Contract" ? "rgb(220,220,220)" : "rgb(256, 256, 256)"}}
            // disabled={this.state.TxType === "Contract"}
            rows={this.state.addrRows}
            cols="80">
          </textarea>
          <h2 style={{"text-align": "left"}}> Value (Wei) </h2>
          <textarea onChange={this.onValueUpdated} rows="1" cols="80" ></textarea>
          <h2 style={{"text-align": "left"}}> {this.state.placeholderText} </h2>
          <textarea onChange={this.handleChange} style={{display: "block", "float": "left"}} rows="20" cols="80" id="editor"></textarea>
          <div style={{display: "flex", "flex-direction": "row", "margin-top": "1em"}}>
            <Button disabled={this.state.loading || (typeof this.state.web3 === 'undefined')} variant="contained" color="primary" onClick={() => this.onSubmitTx()}>
              {this.state.txStatusText}
            </Button>
            <div style={{"padding-top": "5px", "padding-left": "20px"}}>
              <PulseLoader color={'#123abc'} loading={this.state.loading} />
            </div>
          </div>
        </div>


        <TxModal open={this.state.txModalOpen} onClose={this.handleTxModalClose} txReceipt={this.state.txReceipt}></TxModal>
      </div>
    );
  }
}

export default App;
