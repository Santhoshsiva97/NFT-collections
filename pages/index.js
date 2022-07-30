import { Contract, ethers, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { abi, NFT_CONTRACT_ADDRESS } from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {

  const [ walletConnected, setWalletConnected ] = useState(false);
  const [ presaleStarted, setPresaleStarted ] = useState(false);
  const [ presaleEnded, setPresaleEnded ] = useState(false);
  const [ loading, setLoading ] = useState(false);
  const [ tokenIds, setTokenIds ] = useState(0);
  const [ isOwner, setIsOwner ] = useState(false);

  const web3ModalRef = useRef();

  const presaleMint = async () => {
    try {

      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);

      const tx = await nftContract.presaleMint({
        // value signifies the cost of one crypto dev which is "0.01" eth.
        // We are parsing `0.01` string to ether using the utils library from ethers.js
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      tx.wait();
      setLoading(false);
      window.alert("Crypto Dev NFT is successfully minted!!!");

    } catch(err) {
      console.error(err);
    }
  }

  const publicMint = async () => {
    try{

      // if(presaleEnded) {
        const signer = await getProviderOrSigner(true);
        const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);

        const tx = await nftContract.mint({
          // value signifies the cost of one crypto dev which is "0.01" eth.
          // We are parsing `0.01` string to ether using the utils library from ethers.js
          value: utils.parseEther("0.01"),
        });
        setLoading(true);
        tx.wait();
        setLoading(false);
        window.alert("Crypto Dev NFT is successfully minted!!!");

      // } else {
        
      // }

    } catch(err) {
      console.error(err);
    }
  }

  const startPresale = async () => {
    try {
      
      const signer = await getProviderOrSigner(true);

      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      )

      const tx = await whitelistContract.startPresale();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await checkIfPresaleStarted();

    } catch(err) {
      console.error(err);
    }

  }

  const checkIfPresaleStarted = async () => {

    try {
      const signer = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);

      const isPresaleStarted = await nftContract.presaleStarted();

      if(!isPresaleStarted) {
        await getOwner();
      }
      setPresaleStarted(true);
      return presaleStarted;
    } catch(err) {
      console.error(err);
      return false;
    }
  }

  const checkIfPresaleEnded = async() => {
    try{

      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);

      const hasEnded = await nftContract.presaleEnded();
      const _hasEnded = hasEnded.lt(Math.floor(Date.now() / 1000));

      _hasEnded ? setPresaleEnded(true) : setPresaleEnded(false);
      return _hasEnded;

    } catch(err) {
      console.error(err);
      return false;
    }
  }

  const getTokenIdsMinted = async () => {
    try {

      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);

      const getTokenIds = await nftContract.tokenIds();
      setTokenIds(getTokenIds.toString()); // BigO Object

    } catch(err) {
      console.error(err);
    }
  }

  const connectWallet = async () => {
    try {

      const signer = await getProviderOrSigner(true);

      if (signer) {
        setWalletConnected(true);
      }

    } catch(err) {
      console.error(err);
    }

  }

  const getOwner = async () => {
    try {

      const signer = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);

      const _owner = await nftContract.owner();

      const currentSigner = await getProviderOrSigner(true);
      const address = await currentSigner.getAddress();

      if(address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }

    } catch(err) {
      console.error(err);
    }

  }

  const getProviderOrSigner = async (needsigner = false) => {

    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();

    if(chainId != 4) {
      window.alert("Change the network to Rinkeby");
      throw new Error("Change network to Rinkeby");    
    } 

    if (needsigner) {
      const signer = await web3Provider.getSigner();
      return signer;
    }

    return web3Provider;

  }

  useEffect(() => {

    if(!walletConnected) {
      web3ModalRef.current = new Web3Modal ({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

      const _hasPresaleStarted = checkIfPresaleStarted();
      if(_hasPresaleStarted) {
        checkIfPresaleEnded();
      }

      const presaleCheck = setInterval(async function () {
        const _presaleStart = await checkIfPresaleStarted();
        if(_presaleStart) {
          const _presaleEnd = await checkIfPresaleEnded();
          if(_presaleEnd) clearInterval(presaleCheck);
        }
      }, 5 * 1000);

      setInterval(async function () {
        await getTokenIdsMinted();
      }, 5 * 1000);

    }

  }, [walletConnected]);

  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

    // If we are currently waiting for something, return a loading button
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    // If connected user is the owner, and presale hasnt started yet, allow them to start the presale
    if (isOwner && !presaleStarted) {
      return (
        <button className={styles.button} onClick={startPresale}>
          Start Presale!
        </button>
      );
    }

    // If connected user is not the owner but presale hasn't started yet, tell them that
    if (!presaleStarted) {
      return (
        <div>
          <div className={styles.description}>Presale hasnt started!</div>
        </div>
      );
    }

    // If presale started, but hasn't ended yet, allow for minting during the presale period
    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            Presale has started!!! If your address is whitelisted, Mint a
            Crypto Dev 🥳
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

    // If presale started and has ended, its time for public minting
    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publicMint}>
          Public Mint 🚀
        </button>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            Its an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIds}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodevs/0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
}